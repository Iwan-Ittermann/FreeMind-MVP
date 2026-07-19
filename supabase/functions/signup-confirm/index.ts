import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_NOTIFY_EMAIL = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "iwan@freemind.chat";
const FROM = "freemind <noreply@freemind.chat>";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function notifyAdmin(signupEmail: string, confirmedAt: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0a0a0a;max-width:560px;margin:0 auto;padding:32px 24px">
      <h1 style="font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 24px">Neue Anmeldung</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px"><strong>E-Mail:</strong> ${signupEmail}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px"><strong>Bestätigt am:</strong> ${confirmedAt}</p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [ADMIN_NOTIFY_EMAIL],
      subject: `Neue freemind-Anmeldung: ${signupEmail}`,
      html,
    }),
  });
  if (!res.ok) console.error("Admin notify failed:", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (typeof token !== "string" || token.length < 10 || token.length > 128) {
      return Response.json({ status: "invalid" }, { status: 400, headers: corsHeaders });
    }

    const { data: row } = await supabase
      .from("signups")
      .select("id, email, confirmed_at, confirm_token_expires_at")
      .eq("confirm_token", token)
      .maybeSingle();

    if (!row) return Response.json({ status: "invalid" }, { headers: corsHeaders });
    if (row.confirmed_at) {
      return Response.json({ status: "already_confirmed", email: row.email }, { headers: corsHeaders });
    }
    if (!row.confirm_token_expires_at || new Date(row.confirm_token_expires_at) < new Date()) {
      return Response.json({ status: "expired", email: row.email }, { headers: corsHeaders });
    }

    const confirmedAt = new Date().toISOString();
    const { error } = await supabase.from("signups").update({
      confirmed_at: confirmedAt, confirm_token: null, confirm_token_expires_at: null,
    }).eq("id", row.id);
    if (error) throw error;

    const cleanEmail = row.email.replace(/#test-[a-f0-9]+$/, "");
    await notifyAdmin(cleanEmail, confirmedAt);

    return Response.json({ status: "ok", email: cleanEmail }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-confirm error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
