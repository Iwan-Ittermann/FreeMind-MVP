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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

async function sendConfirmEmail(to: string, confirmUrl: string, token: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({
      templateName: "signup-confirm",
      recipientEmail: to,
      idempotencyKey: `signup-confirm-${token}`,
      templateData: { confirmUrl },
    }),
  });
  if (!res.ok) console.error("send-transactional-email failed:", res.status, await res.text());
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

    await sendConfirmEmail(cleaned, `${SITE_URL}/confirm?token=${token}`, token);
    return Response.json({ status: "sent" }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-request error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
