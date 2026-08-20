// Sends the dated campaign emails to confirmed signups.
// Invoked by pg_cron (every 15 min) and manually from admin2-overview.
// Auth: requires the service role key as bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";
import { CAMPAIGNS, getCampaign } from "../_shared/campaigns.ts";

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
    const claims = JSON.parse(json) as { role?: string };
    return claims.role ?? null;
  } catch {
    return null;
  }
}

function cleanEmail(raw: string): string {
  return String(raw).split("#")[0].toLowerCase();
}

/** Signup ids that are currently in the given funnel stage. */
async function nudgeAudience(stage: "rate" | "chat"): Promise<Set<string> | null> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["real_topic_short_code", "discussion_open_at", "discussion_end_at"]);
  const cfg = new Map((settings ?? []).map((r) => [r.key as string, String(r.value ?? "").trim()]));

  const shortCode = cfg.get("real_topic_short_code");
  if (!shortCode) return null;

  const { data: topic } = await supabase
    .from("topics")
    .select("id")
    .eq("short_code", shortCode)
    .maybeSingle();
  if (!topic) return null;
  const topicId = topic.id as string;

  const [{ data: signups }, { data: opinions }, { data: chats }] = await Promise.all([
    supabase.from("signups").select("id, auth_user_id").not("auth_user_id", "is", null),
    supabase.from("opinions").select("id, user_id").eq("topic_id", topicId),
    supabase.from("chats").select("id").eq("topic_id", topicId),
  ]);

  const opinionByUser = new Map<string, string>();
  for (const o of opinions ?? []) opinionByUser.set(o.user_id as string, o.id as string);

  const { data: ratings } = await supabase
    .from("opinion_ratings")
    .select("rater_opinion_id")
    .eq("topic_id", topicId);
  const ratedOpinionIds = new Set((ratings ?? []).map((r) => r.rater_opinion_id as string));

  const chatIds = (chats ?? []).map((c) => c.id as string);
  const senders = new Set<string>();
  if (chatIds.length) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .in("chat_id", chatIds);
    for (const m of msgs ?? []) senders.add(m.sender_id as string);
  }

  const allowed = new Set<string>();
  for (const s of signups ?? []) {
    const userId = s.auth_user_id as string;
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
    .from("signups")
    .select("id, email, passphrase, confirmed_at")
    .not("confirmed_at", "is", null);
  if (onlySignupId) query = query.eq("id", onlySignupId);
  const { data: signups, error } = await query;
  if (error) throw error;

  const [{ data: bans }, { data: suppressed }, { data: alreadySent }] = await Promise.all([
    supabase.from("banned_emails").select("email"),
    supabase.from("suppressed_emails").select("email"),
    supabase.from("campaign_sends").select("signup_id").eq("campaign_key", campaignKey),
  ]);

  const blocked = new Set<string>();
  for (const b of bans ?? []) blocked.add(String(b.email).toLowerCase());
  for (const s of suppressed ?? []) blocked.add(String(s.email).toLowerCase());
  const sentIds = new Set((alreadySent ?? []).map((r) => r.signup_id as string));

  // Funnel nudges: restrict to users actually in that stage and throttle to one
  // nudge mail per user per 24h across all nudge keys.
  const def = getCampaign(campaignKey);
  let stageAllowed: Set<string> | null = null;
  const recentlyNudged = new Set<string>();
  if (def?.nudge) {
    stageAllowed = await nudgeAudience(def.nudge);
    if (!stageAllowed) return [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("campaign_sends")
      .select("signup_id")
      .in("campaign_key", NUDGE_KEYS)
      .gte("sent_at", since);
    for (const r of recent ?? []) recentlyNudged.add(r.signup_id as string);
  }

  return (signups ?? [])
    .map((s) => ({ id: s.id as string, email: cleanEmail(s.email as string), passphrase: (s.passphrase as string | null) ?? null }))
    .filter((s) => !blocked.has(s.email) && (resend || !sentIds.has(s.id)))
    .filter((s) => !stageAllowed || stageAllowed.has(s.id))
    .filter((s) => resend || !recentlyNudged.has(s.id));
}



async function sendCampaign(campaignKey: string, onlySignupId?: string, resend = false) {
  const def = getCampaign(campaignKey);
  if (!def) throw new Error("unknown_campaign");

  const recipients = await loadRecipients(campaignKey, onlySignupId, resend);
  const attempt = Date.now();

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const data = {
      passphrase: r.passphrase ?? "",
      appUrl: SITE_URL,
      goUrl: `${SITE_URL}/go`,
      testUrl: `${SITE_URL}/test`,
      faqUrl: `${SITE_URL}/fragen`,
      sogehtsUrl: `${SITE_URL}/sogehts`,
      graphImg: `${SITE_URL}/__l5e/assets-v1/0cdaff8e-0564-467d-8eb1-580a826033f8/mail-graph.jpg`,
      diffImg: `${SITE_URL}/__l5e/assets-v1/ad327033-7227-4f78-9022-74df5ec96320/mail-sogehts-scale-diff.jpg`,
      understandingImg: `${SITE_URL}/__l5e/assets-v1/b0f17748-5da8-4eb5-bc8f-0dc243429447/mail-sogehts-scale-understanding.jpg`,
      handImg: `${SITE_URL}/__l5e/assets-v1/cc07c31b-45a7-45e9-b4be-1046aeb6b08e/hand-pad.png`,
      trackingUrl: `${SUPABASE_URL}/functions/v1/email-open?c=${encodeURIComponent(campaignKey)}&s=${r.id}`,
    };

    const tpl = await loadTemplate(supabase, campaignKey, data, {
      subject: def.label,
      heading: def.label,
      body: `[${SITE_URL}/go](${SITE_URL}/go)`,
    });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: campaignKey,
        recipientEmail: r.email,
        idempotencyKey: resend ? `${campaignKey}-${r.id}-${attempt}` : `${campaignKey}-${r.id}`,
        templateData: { ...tpl, ...data },
      }),
    });

    if (!res.ok) {
      failed++;
      console.error(`campaign ${campaignKey} failed for ${r.email}:`, res.status, await res.text());
      continue;
    }

    const { error: logErr } = await supabase
      .from("campaign_sends")
      .upsert(
        { campaign_key: campaignKey, signup_id: r.id, recipient_email: r.email },
        { onConflict: "campaign_key,signup_id" },
      );
    if (logErr) console.error("campaign_sends insert:", logErr.message);
    sent++;
  }

  return { campaign: campaignKey, sent, failed, candidates: recipients.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Defense in depth: verify_jwt=true already validates the token at the gateway.
  // Accept any caller whose token carries the service_role claim, so key rotation
  // does not break the scheduled invocation.
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
      const def = getCampaign(campaignKey);
      if (!def) return Response.json({ ok: false, error: "unknown_campaign" }, { status: 400, headers: corsHeaders });
      if (!force && (!def.dueAt || new Date(def.dueAt) > new Date())) {
        return Response.json({ ok: true, skipped: "not_due" }, { headers: corsHeaders });
      }
      results.push(await sendCampaign(campaignKey, signupId, resend));

    } else {
      const now = new Date();
      for (const def of CAMPAIGNS) {
        if (def.dueAt && new Date(def.dueAt) <= now) results.push(await sendCampaign(def.key));
      }
    }


    return Response.json({ ok: true, results }, { headers: corsHeaders });
  } catch (err) {
    console.error("send-campaign-emails error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
