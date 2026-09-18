// Confirms a Gutefrage-event pre-registration. No account is created yet —
// passphrases and event mails follow once the date is fixed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_NOTIFY_EMAIL = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "iwan@freemind.chat";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function notifyAdmin(signupEmail: string, confirmedAt: string) {
  try {
    const { count } = await supabase
      .from("gutefrage_signups")
      .select("id", { count: "exact", head: true })
      .not("confirmed_at", "is", null);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: "gutefrage-admin-notify",
        recipientEmail: ADMIN_NOTIFY_EMAIL,
        idempotencyKey: `gutefrage-admin-${signupEmail}-${confirmedAt}`,
        templateData: { email: signupEmail, confirmedAt, confirmedTotal: count ?? undefined },
      }),
    });
    if (!res.ok) console.error("gutefrage admin notify failed:", res.status, await res.text());
  } catch (err) {
    console.error("gutefrage admin notify error:", err);
  }
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
      .from("gutefrage_signups")
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

    const { error } = await supabase.from("gutefrage_signups").update({
      confirmed_at: new Date().toISOString(),
      confirm_token: null,
      confirm_token_expires_at: null,
    }).eq("id", row.id);
    if (error) throw error;

    return Response.json({ status: "ok", email: row.email }, { headers: corsHeaders });
  } catch (err) {
    console.error("gutefrage-signup-confirm error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
