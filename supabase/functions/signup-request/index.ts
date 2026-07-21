import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const RESEND_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

async function getCutoff(): Promise<Date | null> {
  const { data } = await supabase
    .from("app_settings").select("value").eq("key", "registration_cutoff_at").maybeSingle();
  if (!data?.value) return null;
  const d = new Date(String(data.value));
  return isNaN(d.getTime()) ? null : d;
}

async function sendConfirmEmail(to: string, confirmUrl: string, token: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-confirm",
      recipientEmail: to,
      idempotencyKey: `signup-confirm-${token}`,
      templateData: { confirmUrl },
    }),
  });
  if (!res.ok) console.error("send-transactional-email failed:", res.status, await res.text());
}

async function sendPassphraseEmail(to: string, passphrase: string, issuedAt: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-passphrase",
      recipientEmail: to,
      idempotencyKey: `signup-passphrase-${to}-${issuedAt}-${Math.floor(Date.now() / RESEND_MIN_INTERVAL_MS)}`,
      templateData: { passphrase, appUrl: SITE_URL },
    }),
  });
  if (!res.ok) console.error("send-transactional-email(passphrase) failed:", res.status, await res.text());
}

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

    const cutoff = await getCutoff();
    const cutoffPassed = cutoff !== null && cutoff.getTime() <= Date.now();

    if (testMode) {
      const token = generateToken();
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const storedEmail = `${cleaned}#test-${token.slice(0, 12)}`;
      const { error } = await supabase.from("signups").insert({
        email: storedEmail, confirm_token: token, confirm_token_expires_at: expires,
      });
      if (error) throw error;
      await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`, token);
      return Response.json({ status: "sent" }, { headers: corsHeaders });
    }

    const { data: existing } = await supabase
      .from("signups")
      .select("id, email, confirmed_at, passphrase, passphrase_issued_at, last_passphrase_sent_at")
      .ilike("email", cleaned)
      .maybeSingle();

    // Already confirmed → resend the same passphrase (throttled).
    if (existing?.confirmed_at && existing.passphrase) {
      const lastSent = existing.last_passphrase_sent_at ? new Date(existing.last_passphrase_sent_at).getTime() : 0;
      if (Date.now() - lastSent < RESEND_MIN_INTERVAL_MS) {
        return Response.json(
          { status: "resent", throttled: true },
          { headers: corsHeaders },
        );
      }
      await sendPassphraseEmail(
        cleaned,
        existing.passphrase,
        existing.passphrase_issued_at ?? new Date().toISOString(),
      );
      await supabase
        .from("signups")
        .update({ last_passphrase_sent_at: new Date().toISOString() })
        .eq("id", existing.id);
      return Response.json({ status: "resent" }, { headers: corsHeaders });
    }

    // Confirmed but no passphrase yet (legacy row) — treat as new confirm needed.
    if (existing?.confirmed_at && !existing.passphrase) {
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
        .update({ confirm_token: token, confirm_token_expires_at: expires })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("signups")
        .insert({ email: cleaned, confirm_token: token, confirm_token_expires_at: expires });
      if (error) throw error;
    }

    await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`, token);
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
