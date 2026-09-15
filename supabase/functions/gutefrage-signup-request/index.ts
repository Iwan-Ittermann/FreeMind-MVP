// Pre-registration for the freemind x Gutefrage.net event (November 2026).
// Writes to public.gutefrage_signups and sends the confirmation mail.
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

export async function sendGutefrageConfirmEmail(to: string, confirmUrl: string, idempotencyKey: string) {
  const tpl = await loadTemplate(supabase, "gutefrage-signup-confirm", { confirmUrl }, {
    subject: "Bestätige deine Vorregistrierung — freemind x Gutefrage.net",
    heading: "Bestätige deine Vorregistrierung",
    body:
      `Klick auf den Button, um deine Vorregistrierung für das Event im November abzuschließen.\n\n[Vorregistrierung bestätigen](${confirmUrl})\n\nSobald 100 Menschen bestätigt haben, legen wir das genaue Datum fest — du erfährst es dann als Erste:r.`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "gutefrage-signup-confirm",
      recipientEmail: to,
      idempotencyKey,
      templateData: { ...tpl, confirmUrl },
    }),
  });
  if (!res.ok) console.error("gutefrage confirm mail failed:", res.status, await res.text());
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
      .from("gutefrage_signups")
      .select("id, confirmed_at")
      .ilike("email", cleaned)
      .maybeSingle();

    if (existing?.confirmed_at) {
      return Response.json({ status: "already_confirmed" }, { headers: corsHeaders });
    }

    const token = generateToken();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    if (existing) {
      const { error } = await supabase.from("gutefrage_signups")
        .update({ confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("gutefrage_signups")
        .insert({ email: cleaned, confirm_token: token, confirm_token_expires_at: expires, signup_ip: clientIp });
      if (error) throw error;
    }

    await sendGutefrageConfirmEmail(
      cleaned,
      `${SITE_URL}/gutefrage/confirm?token=${token}`,
      `gutefrage-signup-confirm-${token}`,
    );
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("gutefrage-signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
