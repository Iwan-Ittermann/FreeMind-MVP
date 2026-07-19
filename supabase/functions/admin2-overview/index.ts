import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resendSignupConfirm(signupId: string) {
  const { data: row, error } = await supabase
    .from("signups")
    .select("id, email, confirmed_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error || !row) throw new Error("signup_not_found");
  if (row.confirmed_at) return { skipped: "already_confirmed" };

  const token = generateToken();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error: updErr } = await supabase
    .from("signups")
    .update({ confirm_token: token, confirm_token_expires_at: expires })
    .eq("id", row.id);
  if (updErr) throw updErr;

  const cleanEmail = String(row.email).split("#")[0];
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-confirm",
      recipientEmail: cleanEmail,
      idempotencyKey: `signup-confirm-resend-${token}`,
      templateData: { confirmUrl: `${SITE_URL}/confirm?token=${token}` },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("resend send-transactional-email failed:", res.status, body);
    throw new Error("send_failed");
  }
  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const { password, action, signupId } = body ?? {};
    if (typeof password !== "string" || !ADMIN_PASSWORD || !ctEq(password, ADMIN_PASSWORD)) {
      return Response.json({ ok: false, error: "invalid_password" }, { status: 401, headers: corsHeaders });
    }

    if (action === "resend_signup") {
      if (typeof signupId !== "string") {
        return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      }
      const result = await resendSignupConfirm(signupId);
      return Response.json({ ok: true, ...result }, { headers: corsHeaders });
    }

    const { data: signups, error } = await supabase
      .from("signups")
      .select("id, email, created_at, confirmed_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json({ ok: true, signups: signups ?? [] }, { headers: corsHeaders });
  } catch (err) {
    console.error("admin2-overview error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});

