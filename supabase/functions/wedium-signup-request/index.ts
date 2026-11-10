// Signup for the wedium x freemind event.
// Writes to the separate public.wedium_signups list and sends the wedium
// confirmation mail. Completely independent of the old /go and /aug-test lists.
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

export async function sendWediumConfirmEmail(to: string, confirmUrl: string, idempotencyKey: string) {
  const tpl = await loadTemplate(supabase, "wedium-signup-confirm", { confirmUrl }, {
    subject: "Bestätige deine Anmeldung — wedium x freemind",
    heading: "Bestätige deine Anmeldung",
    body:
      `Klick auf den Button, um deine Anmeldung zum wedium-Event ({{eventDate}}) abzuschließen.\n\n[Anmeldung bestätigen](${confirmUrl})`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "wedium-signup-confirm",
      recipientEmail: to,
      idempotencyKey,
      templateData: { ...tpl, confirmUrl },
    }),
  });
  if (!res.ok) console.error("wedium confirm mail failed:", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email: rawInput } = await req.json();
    const cleaned = String(rawInput ?? "").replace(/^#\s+/, "").trim().toLowerCase();
    if (!isValidEmail(cleaned)) {
      return Response.json({ status: "error", reason: "invalid_email" }, { status: 400, headers: corsHeaders });
    }

    const { data: banned } = await supabase
      .from("banned_emails").select("email").eq("email", cleaned).maybeSingle();
    if (banned) return Response.json({ status: "banned" }, { status: 403, headers: corsHeaders });

    const clientIp = getClientIp(req);

    const { data: existing } = await supabase
      .from("wedium_signups")
      .select("id, confirmed_at")
      .ilike("email", cleaned)
      .maybeSingle();

    if (existing?.confirmed_at) {
      return Response.json({ status: "already_confirmed" }, { headers: corsHeaders });
    }

    const token = generateToken();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    if (existing) {
      const { error } = await supabase.from("wedium_signups")
        .update({ confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("wedium_signups")
        .insert({ email: cleaned, confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp });
      if (error) throw error;
    }

    await sendWediumConfirmEmail(cleaned, `${SITE_URL}/wedium/confirm?token=${token}`, `wedium-signup-confirm-${token}`);
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("wedium-signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
