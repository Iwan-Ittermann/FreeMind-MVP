// Admin board for the Gutefrage.net event pre-registrations (/gutefrage/admin).
// Guarded by the same secret as /wedium/admin (ADMIN3_PASSWORD).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN3_PASSWORD") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const TEMPLATE_KEY = "gutefrage-signup-confirm";
const GOAL = 100;

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function overview() {
  const [{ data: signups }, { data: setting }] = await Promise.all([
    supabase
      .from("gutefrage_signups")
      .select("id, email, created_at, confirmed_at")
      .order("created_at", { ascending: false }),
    supabase.from("app_settings").select("value").eq("key", "gutefrage_event_date").maybeSingle(),
  ]);
  const rows = signups ?? [];
  const confirmed = rows.filter((r) => r.confirmed_at).length;
  return {
    ok: true,
    signups: rows,
    stats: { total: rows.length, confirmed, pending: rows.length - confirmed, goal: GOAL },
    eventDate: (setting?.value ?? "").trim() || null,
  };
}

async function resendConfirm(signupId: string) {
  const { data: row } = await supabase
    .from("gutefrage_signups")
    .select("id, email, confirmed_at")
    .eq("id", signupId)
    .maybeSingle();
  if (!row) return { ok: false };
  if (row.confirmed_at) return { ok: true, skipped: "already_confirmed" };

  const token = generateToken();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("gutefrage_signups")
    .update({ confirm_token: token, confirm_token_expires_at: expires })
    .eq("id", row.id);
  if (error) throw error;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/gutefrage-signup-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({ email: row.email }),
  });
  if (!res.ok) console.error("resend failed:", res.status, await res.text());
  return { ok: true, sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password ?? "");
    if (!ADMIN_PASSWORD || !ctEq(password, ADMIN_PASSWORD)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const action = String(body?.action ?? "overview");

    switch (action) {
      case "overview":
        return Response.json(await overview(), { headers: corsHeaders });

      case "get_template": {
        const { data } = await supabase
          .from("email_templates")
          .select("key, subject, heading, body_md, updated_at")
          .eq("key", TEMPLATE_KEY)
          .maybeSingle();
        return Response.json({ ok: true, template: data ?? null }, { headers: corsHeaders });
      }

      case "save_template": {
        const { error } = await supabase.from("email_templates").upsert({
          key: TEMPLATE_KEY,
          subject: String(body?.subject ?? "").slice(0, 300),
          heading: String(body?.heading ?? "").slice(0, 300),
          body_md: String(body?.body_md ?? "").slice(0, 20000),
        }, { onConflict: "key" });
        if (error) throw error;
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      case "set_event_date": {
        const value = String(body?.value ?? "").trim().slice(0, 120);
        const { data: existing } = await supabase
          .from("app_settings").select("id").eq("key", "gutefrage_event_date").maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("app_settings").update({ value }).eq("key", "gutefrage_event_date");
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("app_settings").insert({ key: "gutefrage_event_date", value });
          if (error) throw error;
        }
        return Response.json({ ok: true, eventDate: value || null }, { headers: corsHeaders });
      }

      case "resend_confirm":
        return Response.json(await resendConfirm(String(body?.signupId ?? "")), { headers: corsHeaders });

      case "delete_signup": {
        const { error } = await supabase
          .from("gutefrage_signups").delete().eq("id", String(body?.signupId ?? ""));
        if (error) throw error;
        return Response.json({ ok: true, deleted: true }, { headers: corsHeaders });
      }

      case "ban_signup": {
        const { data: row } = await supabase
          .from("gutefrage_signups").select("id, email").eq("id", String(body?.signupId ?? "")).maybeSingle();
        if (!row) return Response.json({ ok: false }, { headers: corsHeaders });
        await supabase.from("banned_emails").upsert(
          { email: String(row.email).toLowerCase(), reason: "gutefrage admin" },
          { onConflict: "email" },
        );
        await supabase.from("gutefrage_signups").delete().eq("id", row.id);
        return Response.json({ ok: true, banned: true }, { headers: corsHeaders });
      }

      case "list_bans": {
        const { data } = await supabase
          .from("banned_emails").select("email, banned_at, reason").order("banned_at", { ascending: false });
        return Response.json({ ok: true, bans: data ?? [] }, { headers: corsHeaders });
      }

      case "unban_email": {
        const { error } = await supabase
          .from("banned_emails").delete().eq("email", String(body?.email ?? "").toLowerCase());
        if (error) throw error;
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      default:
        return Response.json({ ok: false, error: "unknown_action" }, { status: 400, headers: corsHeaders });
    }
  } catch (err) {
    console.error("gutefrage-admin error:", err, SITE_URL);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
