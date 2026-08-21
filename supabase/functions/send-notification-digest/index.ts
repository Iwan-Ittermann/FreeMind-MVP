// Sends each participant a daily digest of their unread notifications.
// Invoked by pg_cron (once per day) and manually from admin2-overview.
// Auth: service role bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

/** Reads the `role` claim of a JWT without verifying the signature (gateway verifies it). */
function jwtRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/** Berlin calendar date (YYYY-MM-DD). */
function berlinDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function cleanEmail(raw: string): string {
  return String(raw).split("#")[0].toLowerCase();
}

interface NotificationRow {
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  message: "Neue Nachricht",
  chat_request: "Neues Gespräch",
  opinion: "Neue Meinung",
};

async function run(resend: boolean, onlySignupId?: string) {
  const date = berlinDate();

  let signupQuery = supabase
    .from("signups")
    .select("id, email, auth_user_id, confirmed_at, notification_digest_opt_in")
    .not("confirmed_at", "is", null)
    .not("auth_user_id", "is", null)
    .eq("notification_digest_opt_in", true);
  if (onlySignupId) signupQuery = signupQuery.eq("id", onlySignupId);

  const [{ data: signups }, { data: bans }, { data: suppressed }] = await Promise.all([
    signupQuery,
    supabase.from("banned_emails").select("email"),
    supabase.from("suppressed_emails").select("email"),
  ]);

  const blocked = new Set<string>();
  for (const b of bans ?? []) blocked.add(String(b.email).toLowerCase());
  for (const s of suppressed ?? []) blocked.add(String(s.email).toLowerCase());

  const userIds = (signups ?? []).map((s) => s.auth_user_id as string);
  if (!userIds.length) return { date, sent: 0, failed: 0, skipped: 0 };

  const { data: unread } = await supabase
    .from("notifications")
    .select("user_id, type, title, body, created_at")
    .is("read_at", null)
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  const byUser = new Map<string, NotificationRow[]>();
  for (const n of (unread ?? []) as NotificationRow[]) {
    const list = byUser.get(n.user_id) ?? [];
    list.push(n);
    byUser.set(n.user_id, list);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const s of signups ?? []) {
    const email = cleanEmail(s.email as string);
    if (blocked.has(email)) {
      skipped++;
      continue;
    }
    const items = byUser.get(s.auth_user_id as string) ?? [];
    if (!items.length) {
      skipped++;
      continue;
    }

    const counts = new Map<string, number>();
    for (const n of items) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    const summary = [...counts.entries()]
      .map(([type, count]) => `${count} × ${TYPE_LABEL[type] ?? type}`)
      .join(" · ");

    const list = items
      .slice(0, 12)
      .map((n) => `- **${n.title}**${n.body ? `: ${n.body}` : ""}`)
      .join("\n");

    const data = {
      digestCount: String(items.length),
      digestSummary: summary,
      digestList: list,
      goUrl: `${SITE_URL}/go`,
      notificationsUrl: `${SITE_URL}/benachrichtigungen`,
      appUrl: SITE_URL,
    };

    const tpl = await loadTemplate(supabase, "notification-digest", data, {
      subject: `${items.length} ungelesene Benachrichtigungen`,
      heading: "Ungelesen bei freemind",
      body: `{{digestSummary}}\n\n{{digestList}}\n\n[Zur Diskussion]({{goUrl}})`,
    });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: "notification-digest",
        recipientEmail: email,
        idempotencyKey: resend
          ? `notification-digest-${date}-${s.id}-${Date.now()}`
          : `notification-digest-${date}-${s.id}`,
        templateData: { ...tpl, ...data },
      }),
    });

    if (!res.ok) {
      failed++;
      console.error("notification-digest send failed:", email, res.status, await res.text());
      continue;
    }
    sent++;
  }

  return { date, sent, failed, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || (token !== SERVICE_ROLE && jwtRole(token) !== "service_role")) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    const result = await run(payload.resend === true, typeof payload.signupId === "string" ? payload.signupId : undefined);
    return Response.json({ ok: true, ...result }, { headers: corsHeaders });
  } catch (err) {
    console.error("send-notification-digest error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
