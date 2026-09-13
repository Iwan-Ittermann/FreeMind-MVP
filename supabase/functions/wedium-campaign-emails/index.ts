// Sends the wedium event mails to confirmed wedium signups.
// Invoked by pg_cron (every 15 min) and manually from admin3-overview.
// Auth: requires the service role key as bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";
import { getWediumCampaign, WEDIUM_CAMPAIGNS, WEDIUM_NUDGE_KEYS } from "../_shared/wedium-campaigns.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Recipient {
  id: string;
  email: string;
  passphrase: string | null;
}

function parseJwtRole(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/** True while the event discussion phase is running (nudges only go out then). */
async function discussionOpen(): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["discussion_open_at", "discussion_end_at"]);
  const cfg = new Map((data ?? []).map((r) => [r.key as string, String(r.value ?? "").trim()]));
  const start = cfg.get("discussion_open_at") ? new Date(cfg.get("discussion_open_at")!).getTime() : null;
  const end = cfg.get("discussion_end_at") ? new Date(cfg.get("discussion_end_at")!).getTime() : null;
  const now = Date.now();
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

async function eventTopicId(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings").select("value").eq("key", "real_topic_short_code").maybeSingle();
  const shortCode = String(data?.value ?? "").trim();
  if (!shortCode) return null;
  const { data: topic } = await supabase
    .from("topics").select("id").eq("short_code", shortCode).maybeSingle();
  return (topic?.id as string | undefined) ?? null;
}

/** wedium signup ids currently in the given funnel stage. */
async function nudgeAudience(stage: "opinion" | "rate" | "chat"): Promise<Set<string> | null> {
  const topicId = await eventTopicId();
  if (!topicId) return null;

  const [{ data: signups }, { data: opinions }, { data: chats }] = await Promise.all([
    supabase.from("wedium_signups").select("id, auth_user_id, confirmed_at").not("confirmed_at", "is", null),
    supabase.from("opinions").select("id, user_id, created_at").eq("topic_id", topicId),
    supabase.from("chats").select("id").eq("topic_id", topicId),
  ]);

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  if (stage === "opinion") {
    const withOpinion = new Set((opinions ?? []).map((o) => o.user_id as string));
    const allowed = new Set<string>();
    for (const s of signups ?? []) {
      const uid = s.auth_user_id as string | null;
      if (uid && withOpinion.has(uid)) continue;
      const confirmed = new Date(String(s.confirmed_at ?? "")).getTime();
      if (!Number.isFinite(confirmed) || confirmed > cutoff) continue;
      allowed.add(s.id as string);
    }
    return allowed;
  }

  const opinionByUser = new Map<string, string>();
  for (const o of opinions ?? []) {
    const created = new Date(o.created_at as string).getTime();
    if (!Number.isFinite(created) || created > cutoff) continue;
    opinionByUser.set(o.user_id as string, o.id as string);
  }

  const { data: ratings } = await supabase
    .from("opinion_ratings").select("rater_opinion_id").eq("topic_id", topicId);
  const ratedOpinionIds = new Set((ratings ?? []).map((r) => r.rater_opinion_id as string));

  const chatIds = (chats ?? []).map((c) => c.id as string);
  const senders = new Set<string>();
  if (chatIds.length) {
    const { data: msgs } = await supabase.from("chat_messages").select("sender_id").in("chat_id", chatIds);
    for (const m of msgs ?? []) senders.add(m.sender_id as string);
  }

  const allowed = new Set<string>();
  for (const s of signups ?? []) {
    const userId = s.auth_user_id as string | null;
    if (!userId) continue;
    const opinionId = opinionByUser.get(userId);
    if (!opinionId) continue;
    const hasRated = ratedOpinionIds.has(opinionId);
    const hasWritten = senders.has(userId);
    if (stage === "rate" && !hasRated) allowed.add(s.id as string);
    if (stage === "chat" && hasRated && !hasWritten) allowed.add(s.id as string);
  }
  return allowed;
}

async function loadRecipients(campaignKey: string, onlySignupId?: string, resend = false): Promise<Recipient[]> {
  let query = supabase
    .from("wedium_signups")
    .select("id, email, passphrase, confirmed_at")
    .not("confirmed_at", "is", null);
  if (onlySignupId) query = query.eq("id", onlySignupId);
  const { data: signups, error } = await query;
  if (error) throw error;

  const [{ data: bans }, { data: suppressed }, { data: alreadySent }] = await Promise.all([
    supabase.from("banned_emails").select("email"),
    supabase.from("suppressed_emails").select("email"),
    supabase.from("wedium_campaign_sends").select("signup_id").eq("campaign_key", campaignKey),
  ]);

  const blocked = new Set<string>();
  for (const b of bans ?? []) blocked.add(String(b.email).toLowerCase());
  for (const s of suppressed ?? []) blocked.add(String(s.email).toLowerCase());
  const sentIds = new Set((alreadySent ?? []).map((r) => r.signup_id as string));

  const def = getWediumCampaign(campaignKey);
  let stageAllowed: Set<string> | null = null;
  const recentlyNudged = new Set<string>();
  if (def?.nudge && !onlySignupId) {
    stageAllowed = await nudgeAudience(def.nudge);
    if (!stageAllowed) return [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("wedium_campaign_sends")
      .select("signup_id")
      .in("campaign_key", WEDIUM_NUDGE_KEYS)
      .gte("sent_at", since);
    for (const r of recent ?? []) recentlyNudged.add(r.signup_id as string);
  }

  return (signups ?? [])
    .map((s) => ({
      id: s.id as string,
      email: String(s.email).toLowerCase(),
      passphrase: (s.passphrase as string | null) ?? null,
    }))
    .filter((s) => !blocked.has(s.email) && (resend || !sentIds.has(s.id)))
    .filter((s) => !stageAllowed || stageAllowed.has(s.id))
    .filter((s) => resend || !recentlyNudged.has(s.id));
}

async function sendCampaign(campaignKey: string, onlySignupId?: string, resend = false) {
  const def = getWediumCampaign(campaignKey);
  if (!def) throw new Error("unknown_campaign");

  const recipients = await loadRecipients(campaignKey, onlySignupId, resend);
  const attempt = Date.now();

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const data = {
      passphrase: r.passphrase ?? "",
      appUrl: SITE_URL,
      goUrl: `${SITE_URL}/wedium/go`,
      wediumUrl: `${SITE_URL}/wedium`,
      faqUrl: `${SITE_URL}/fragen`,
      sogehtsUrl: `${SITE_URL}/sogehts`,
      trackingUrl: `${SUPABASE_URL}/functions/v1/email-open?c=${encodeURIComponent(campaignKey)}&s=${r.id}&w=1`,
    };

    const tpl = await loadTemplate(supabase, campaignKey, data, {
      subject: def.label,
      heading: def.label,
      body: `[${SITE_URL}/wedium/go](${SITE_URL}/wedium/go)`,
    });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: campaignKey,
        recipientEmail: r.email,
        idempotencyKey: resend ? `w-${campaignKey}-${r.id}-${attempt}` : `w-${campaignKey}-${r.id}`,
        templateData: { ...tpl, ...data },
      }),
    });

    if (!res.ok) {
      failed++;
      console.error(`wedium campaign ${campaignKey} failed for ${r.email}:`, res.status, await res.text());
      continue;
    }

    const { error: logErr } = await supabase
      .from("wedium_campaign_sends")
      .upsert(
        { campaign_key: campaignKey, signup_id: r.id, recipient_email: r.email },
        { onConflict: "campaign_key,signup_id" },
      );
    if (logErr) console.error("wedium_campaign_sends insert:", logErr.message);
    sent++;
  }

  return { campaign: campaignKey, sent, failed, candidates: recipients.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== SERVICE_ROLE && parseJwtRole(token) !== "service_role") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    const campaignKey = typeof payload.campaignKey === "string" ? payload.campaignKey : undefined;
    const signupId = typeof payload.signupId === "string" ? payload.signupId : undefined;
    const force = payload.force === true;
    const resend = payload.resend === true;

    const results: unknown[] = [];

    if (campaignKey) {
      const def = getWediumCampaign(campaignKey);
      if (!def) return Response.json({ ok: false, error: "unknown_campaign" }, { status: 400, headers: corsHeaders });
      if (!force && !def.nudge && (!def.dueAt || new Date(def.dueAt) > new Date())) {
        return Response.json({ ok: true, skipped: "not_due" }, { headers: corsHeaders });
      }
      results.push(await sendCampaign(campaignKey, signupId, resend));
    } else {
      const now = new Date();
      for (const def of WEDIUM_CAMPAIGNS) {
        if (def.dueAt && new Date(def.dueAt) <= now) results.push(await sendCampaign(def.key));
      }
      if (await discussionOpen()) {
        for (const key of WEDIUM_NUDGE_KEYS) {
          const def = getWediumCampaign(key);
          if (def?.startAt && new Date(def.startAt) > now) continue;
          results.push(await sendCampaign(key));
        }
      }
    }

    return Response.json({ ok: true, results }, { headers: corsHeaders });
  } catch (err) {
    console.error("wedium-campaign-emails error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
