import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind-prototype.lovable.app";
const FROM = "freemind <noreply@freemind.chat>";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

async function sendConfirmEmail(to: string, confirmUrl: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0a0a0a;max-width:560px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff5a1f;margin:0 0 16px">
        Produktive ideologische Reibung
      </p>
      <h1 style="font-size:32px;font-weight:900;line-height:1;text-transform:uppercase;letter-spacing:-.02em;margin:0 0 24px">
        Bestätige deine Anmeldung
      </h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px">
        Klick auf den Button, um deine Anmeldung bei freemind abzuschließen. Erst danach bist du wirklich dabei.
      </p>
      <p style="margin:32px 0">
        <a href="${confirmUrl}" style="background:#0a0a0a;color:#fff;padding:14px 28px;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;display:inline-block">
          Anmeldung bestätigen
        </a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#525252">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
        <span style="word-break:break-all">${confirmUrl}</span>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#525252">
        Der Link ist 48 Stunden gültig. Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.
      </p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: "Bestätige deine Anmeldung bei freemind",
      html,
    }),
  });
  if (!res.ok) console.error("Resend send failed:", res.status, await res.text());
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

    const token = generateToken();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    if (testMode) {
      const storedEmail = `${cleaned}#test-${token.slice(0, 12)}`;
      const { error } = await supabase.from("signups").insert({
        email: storedEmail, confirm_token: token, confirm_token_expires_at: expires,
      });
      if (error) throw error;
    } else {
      const { data: existing } = await supabase
        .from("signups").select("id, confirmed_at").ilike("email", cleaned).maybeSingle();

      if (existing?.confirmed_at) {
        return Response.json({ status: "already_confirmed" }, { headers: corsHeaders });
      }
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
    }

    await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`);
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
