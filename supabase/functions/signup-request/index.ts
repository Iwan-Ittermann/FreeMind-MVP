import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);



function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

function getClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? null;
}

/** Registration closes at the explicit cutoff or, at the latest, when the discussion starts. */
async function getCutoff(): Promise<Date | null> {
  const { data } = await supabase
    .from("app_settings").select("key, value")
    .in("key", ["registration_cutoff_at", "discussion_open_at"]);
  const dates = (data ?? [])
    .map((r) => new Date(String(r.value ?? "")))
    .filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

async function sendConfirmEmail(to: string, confirmUrl: string, token: string) {
  const tpl = await loadTemplate(supabase, "signup-confirm", { confirmUrl }, {
    subject: "Bestätige deine Anmeldung bei freemind",
    heading: "Bestätige deine Anmeldung",
    body: `Klick auf den Button, um deine Anmeldung bei freemind abzuschließen.\n\n[Anmeldung bestätigen](${confirmUrl})`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-confirm",
      recipientEmail: to,
      idempotencyKey: `signup-confirm-${token}`,
      templateData: { ...tpl, confirmUrl },
    }),
  });
  if (!res.ok) console.error("send-transactional-email failed:", res.status, await res.text());
}

// The standalone passphrase mail is no longer sent from here.
// The passphrase is delivered with the "Prepare" campaign mail (19.08.).
// Manual resend stays available in /admin2.


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email: rawInput } = await req.json();
    const raw = String(rawInput ?? "");
    const testMode = /^#\s+/.test(raw);
    const cleaned = (testMode ? raw.replace(/^#\s+/, "") : raw).trim().toLowerCase();
    if (!isValidEmail(cleaned)) {
      return Response.json({ status: "error", reason: "invalid_email" }, { status: 400, headers: corsHeaders });
    }

    // Ban check
    const { data: banned } = await supabase
      .from("banned_emails").select("email").eq("email", cleaned).maybeSingle();
    if (banned) {
      return Response.json({ status: "banned" }, { status: 403, headers: corsHeaders });
    }

    const clientIp = getClientIp(req);
    const cutoff = await getCutoff();
    const cutoffPassed = cutoff !== null && cutoff.getTime() <= Date.now();

    if (testMode) {
      const token = generateToken();
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const storedEmail = `${cleaned}#test-${token.slice(0, 12)}`;
      const { error } = await supabase.from("signups").insert({
        email: storedEmail, confirm_token: token, confirm_token_expires_at: expires,
        signup_ip: clientIp,
      });
      if (error) throw error;
      await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`, token);
      return Response.json({ status: "sent" }, { headers: corsHeaders });
    }

    const { data: existing } = await supabase
      .from("signups")
      .select("id, email, confirmed_at, passphrase")
      .ilike("email", cleaned)
      .maybeSingle();

    // Already confirmed → no mail at all. Passphrase comes with the Prepare mail.
    if (existing?.confirmed_at) {
      return Response.json({ status: "already_confirmed" }, { headers: corsHeaders });
    }


    // New signup or reissued token — blocked if cutoff has passed.
    if (cutoffPassed) {
      return Response.json({ status: "closed" }, { headers: corsHeaders });
    }

    const token = generateToken();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    if (existing) {
      const { error } = await supabase.from("signups")
        .update({ confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("signups")
        .insert({ email: cleaned, confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp });
      if (error) throw error;
    }

    await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`, token);
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
