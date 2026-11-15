// Sends the wedium event mails to confirmed wedium signups.
// Invoked by pg_cron (every 15 min) and manually from admin3-overview.
// Auth: requires the service role key as bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadEventTokens, loadTemplate } from "../_shared/email-template-store.ts";
import { getWediumCampaign, WEDIUM_CAMPAIGNS, WEDIUM_NUDGE_KEYS } from "../_shared/wedium-campaigns.ts";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { unansweredChats } from "../_shared/unanswered-chat.ts";
import { endspurtSegment, smartTruncate } from "../_shared/endspurt-segment.ts";

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
  confirmed_at?: string | null;
}

/** Personal login link; with a partner opinion id the discussion opens that chat directly. */
function goLink(passphrase: string | null, partnerOpinionId?: string | null) {
  const q = new URLSearchParams();
  if (passphrase) q.set("p", passphrase);
  if (partnerOpinionId) q.set("chat", partnerOpinionId);
  const qs = q.toString();
  return `${SITE_URL}/wedium/go${qs ? `?${qs}` : ""}`;
}

function partnerOpinionIdOf(chat: { opinion_a_id: string; opinion_b_id: string } | undefined, userOf: Map<string, string>, userId: string) {
  if (!chat) return null;
  return userOf.get(chat.opinion_a_id) === userId ? chat.opinion_b_id : chat.opinion_a_id;
}

const PS_TEXT = "Wer hat dich gut verstanden? Wer hat dich beeindruckt? Sag es ihnen mit einem Klick: Ganz unten im Chat, direkt über dem Eingabefeld, bewertest du, wie gut dich dein Gegenüber verstanden hat. Nur so entstehen Brückenpunkte.";

async function sendReplyReminder(signupId: string, dryRun = false) {
  const key = "wedium-reply-reminder";
  if (!(await discussionOpen())) return { campaign: key, sent: 0, failed: 0, skipped: "discussion_closed" };
  const { data: signup, error } = await supabase.from("wedium_signups").select("id, auth_user_id, confirmed_at").eq("id", signupId).maybeSingle();
  if (error) throw error;
  if (!signup?.auth_user_id || !signup.confirmed_at) return { campaign: key, sent: 0, failed: 0, skipped: "not_confirmed" };
  const [recipient] = await loadRecipients(key, signupId);
  if (!recipient) return { campaign: key, sent: 0, failed: 0, skipped: "already_sent_or_suppressed" };
  const topicId = await eventTopicId();
  if (!topicId) throw new Error("missing_event_topic");
  const { data: opinions, error: opinionError } = await supabase.from("opinions").select("id, user_id, text").eq("topic_id", topicId).eq("visible", true);
  if (opinionError) throw opinionError;
  const users = new Map((opinions ?? []).map(o => [o.id, o.user_id]));
  const { data: chats, error: chatError } = await supabase.from("chats").select("id, opinion_a_id, opinion_b_id").eq("topic_id", topicId);
  if (chatError) throw chatError;
  const ownChats = (chats ?? []).filter(c => users.get(c.opinion_a_id) === signup.auth_user_id || users.get(c.opinion_b_id) === signup.auth_user_id);
  if (!ownChats.length) return { campaign: key, sent: 0, failed: 0, skipped: "no_chats" };
  const { data: messages, error: messageError } = await supabase.from("chat_messages").select("id, chat_id, sender_id, content, created_at").in("chat_id", ownChats.map(c => c.id)).eq("visible", true).eq("status", "Visible");
  if (messageError) throw messageError;
  const pending = unansweredChats(signup.auth_user_id, ownChats.map(c => ({ id: c.id, a: users.get(c.opinion_a_id) ?? "", b: users.get(c.opinion_b_id) ?? "" })), messages ?? []);
  const message = pending[0];
  if (!message) return { campaign: key, sent: 0, failed: 0, skipped: "already_answered" };
  const ownOpinion = (opinions ?? []).find(o => o.user_id === signup.auth_user_id)?.text ?? "";
  const partnerOpinion = (opinions ?? []).find(o => o.user_id === message.sender_id)?.text ?? "";
  if (dryRun) return { campaign: key, candidates: 1, unanswered: pending.length, sent: 0, failed: 0 };
  const data = {
    ownOpinion: String(ownOpinion).slice(0, 400), partnerOpinion: String(partnerOpinion).slice(0, 400),
    messageExcerpt: message.content.slice(0, 600), unansweredCount: String(pending.length),
    goUrl: goLink(recipient.passphrase, partnerOpinionIdOf(ownChats.find(c => c.id === message.chat_id), users, signup.auth_user_id)),
    trackingUrl: `${SUPABASE_URL}/functions/v1/email-open?c=${key}&s=${signupId}&w=1`,
  };
  const tpl = await loadTemplate(supabase, key, data, { subject: "Eine Nachricht wartet auf deine Antwort", heading: "Dein Gegenüber hat dir geschrieben", body: "" });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` }, body: JSON.stringify({ templateName: key, recipientEmail: recipient.email, idempotencyKey: `w-${key}-${signupId}`, templateData: { ...tpl, ...data } }) });
  if (!res.ok) throw new Error(`reply_reminder_failed_${res.status}`);
  const outcome = await res.json();
  if (!outcome.success) return { campaign: key, sent: 0, failed: 0, skipped: outcome.reason ?? "not_sent" };
  const { error: logError } = await supabase.from("wedium_campaign_sends").upsert({ campaign_key: key, signup_id: signupId, recipient_email: recipient.email }, { onConflict: "campaign_key,signup_id" });
  if (logError) throw logError;
  return { campaign: key, sent: 1, failed: 0, queued: true, unanswered: pending.length };
}

const ENDSPURT = "campaign-wedium-endspurt";

/** Segment-specific heading and opening line of the Endspurt mail. */
const ENDSPURT_INTRO: Record<string, { heading: string; body: string }> = {
  understanding: { heading: "Wie gut wurdest du verstanden?", body: "Du hattest bereits einen Austausch – jetzt fehlt nur noch deine Bewertung, damit dein Gegenüber Brückenpunkte erhält:" },
  reply: { heading: "Jemand wartet auf deine Antwort", body: "In deinem Chat wartet eine Nachricht auf dich – ein kurzer Satz reicht schon:" },
  "start-chat": { heading: "Bring deine Meinung ins Gespräch", body: "Deine Meinung steht bereits im Graph – starte jetzt noch einen Dialog mit einer Gegenposition:" },
  opinion: { heading: "Deine Perspektive fehlt noch", body: "Bisher hast du noch keine Meinung geteilt – setze jetzt noch deinen Punkt auf die Karte:" },
};

/** Personalised final-sprint mail: one CTA per person (see endspurt-segment.ts). */
async function sendEndspurt(onlySignupId: string | undefined, resend: boolean, dryRun: boolean) {
  const key = ENDSPURT;
  if (!dryRun && !(await discussionOpen())) return { campaign: key, sent: 0, failed: 0, skipped: "discussion_closed" };
  const topicId = await eventTopicId();
  if (!topicId) throw new Error("missing_event_topic");
  const recipients = await loadRecipients(key, onlySignupId, resend || dryRun);
  const { data: signups } = await supabase.from("wedium_signups").select("id, auth_user_id").not("confirmed_at", "is", null);
  const userBySignup = new Map((signups ?? []).map((s) => [s.id as string, s.auth_user_id as string | null]));
  const [{ data: opinions }, { data: chats }] = await Promise.all([
    supabase.from("opinions").select("id, user_id, text").eq("topic_id", topicId).eq("visible", true),
    supabase.from("chats").select("id, opinion_a_id, opinion_b_id").eq("topic_id", topicId),
  ]);
  const userOf = new Map((opinions ?? []).map((o) => [o.id as string, o.user_id as string]));
  const chatIds = (chats ?? []).map((c) => c.id as string);
  const [{ data: messages }, { data: ratings }] = chatIds.length ? await Promise.all([
    supabase.from("chat_messages").select("id, chat_id, sender_id, content, created_at").in("chat_id", chatIds).eq("visible", true).eq("status", "Visible"),
    supabase.from("chat_ratings").select("chat_id, rater_id").in("chat_id", chatIds),
  ]) : [{ data: [] }, { data: [] }];
  const tokens = await loadEventTokens(supabase, "wedium");
  const attempt = Date.now();
  const segments: Record<string, string> = {};
  let sent = 0, failed = 0;
  for (const r of recipients) {
    const userId = userBySignup.get(r.id);
    if (!userId) continue;
    const own = (chats ?? []).filter((c) => userOf.get(c.opinion_a_id) === userId || userOf.get(c.opinion_b_id) === userId)
      .map((c) => ({ id: c.id as string, a: userOf.get(c.opinion_a_id) ?? "", b: userOf.get(c.opinion_b_id) ?? "" }));
    const ownIds = new Set(own.map((c) => c.id));
    const res = endspurtSegment({
      userId,
      hasOpinion: (opinions ?? []).some((o) => o.user_id === userId),
      chats: own,
      messages: (messages ?? []).filter((m) => ownIds.has(m.chat_id as string)) as never,
      ratedChatIds: new Set((ratings ?? []).filter((x) => x.rater_id === userId).map((x) => x.chat_id as string)),
    });
    segments[r.id] = res.segment;
    if (dryRun) continue;
    const focusRow = (chats ?? []).find((c) => c.id === res.chatId);
    const data = {
      segment: res.segment,
      ownOpinion: smartTruncate((opinions ?? []).find((o) => o.user_id === userId)?.text ?? "", 160),
      partnerMessage: res.partnerMessage ? smartTruncate(res.partnerMessage.content, 160) : "",
      unratedCount: String(res.unratedCount), unansweredCount: String(res.unansweredCount),
      goUrl: goLink(r.passphrase, partnerOpinionIdOf(focusRow as never, userOf, userId)),
      trackingUrl: `${SUPABASE_URL}/functions/v1/email-open?c=${key}&s=${r.id}&w=1`,
    };
    const tpl = await loadTemplate(supabase, key, data, { subject: "Endspurt: Heute bis 23:59 Uhr", heading: "Endspurt! Ein letzter Schritt zählt", body: "Heute um 23:59 Uhr endet die Diskussion zu „{{eventQuestion}}“. Ein letzter Besuch lohnt sich: Unten siehst du, was bei dir noch offen ist." });
    const intro = ENDSPURT_INTRO[res.segment];
    const end = `Heute um 23:59 Uhr endet die Diskussion zu „${tokens.eventQuestion ?? "unserer Frage"}“. `;
    const personal = { heading: intro.heading, body: end + intro.body };
    const out = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` }, body: JSON.stringify({ templateName: key, recipientEmail: r.email, idempotencyKey: resend ? `w-${key}-${r.id}-${attempt}` : `w-${key}-${r.id}`, templateData: { ...tpl, ...personal, ...data } }) });
    if (!out.ok) { failed++; console.error("endspurt failed", r.id, out.status, await out.text()); continue; }
    const { error: logErr } = await supabase.from("wedium_campaign_sends").upsert({ campaign_key: key, signup_id: r.id, recipient_email: r.email }, { onConflict: "campaign_key,signup_id" });
    if (logErr) console.error("wedium_campaign_sends insert:", logErr.message);
    sent++;
  }
  return { campaign: key, sent, failed, candidates: recipients.length, segments };
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

const LATE_SIGNUP_GRACE_MS = 2 * 60 * 60 * 1000;

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
      confirmed_at: (s.confirmed_at as string | null) ?? null,
    }))
    .filter((s) => !blocked.has(s.email) && (resend || !sentIds.has(s.id)))
    // Late signups (confirmed well after a dated campaign was due) only get the
    // welcome mail with their passphrase, never stale pre-start campaigns.
    .filter((s) => onlySignupId || resend || !def?.dueAt || !s.confirmed_at
      || new Date(s.confirmed_at).getTime() <= new Date(def.dueAt).getTime() + LATE_SIGNUP_GRACE_MS)
    .filter((s) => !stageAllowed || stageAllowed.has(s.id))
    .filter((s) => resend || !recentlyNudged.has(s.id));
}

async function sendCampaign(campaignKey: string, onlySignupId?: string, resend = false) {
  const def = getWediumCampaign(campaignKey);
  if (!def) throw new Error("unknown_campaign");
  if (def.disabled) return { campaign: campaignKey, sent: 0, failed: 0, skipped: "disabled" };

  const recipients = await loadRecipients(campaignKey, onlySignupId, resend);
  const attempt = Date.now();

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const data = {
      passphrase: r.passphrase ?? "",
      appUrl: SITE_URL,
      goUrl: r.passphrase ? `${SITE_URL}/wedium/go?p=${encodeURIComponent(r.passphrase)}` : `${SITE_URL}/wedium/go`,
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
        templateData: { ...tpl, ...data, ps: PS_TEXT },
      }),
    });

    if (!res.ok) {
      failed++;
      console.error(`wedium campaign ${campaignKey} failed for signup ${r.id}:`, res.status, await res.text());
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
  if (token !== SERVICE_ROLE && authenticateCronRequest(req) !== null) {
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

    if (campaignKey === "wedium-reply-reminder") {
      if (!signupId || !/^[0-9a-f-]{36}$/i.test(signupId)) return Response.json({ ok: false, error: "single_signup_required" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, results: [await sendReplyReminder(signupId, payload.dryRun === true)] }, { headers: corsHeaders });
    }

    if (campaignKey === ENDSPURT) {
      if (signupId && !/^[0-9a-f-]{36}$/i.test(signupId)) return Response.json({ ok: false, error: "invalid_signup" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, results: [await sendEndspurt(signupId, resend, payload.dryRun === true)] }, { headers: corsHeaders });
    }

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
        if (!def.disabled && def.dueAt && new Date(def.dueAt) <= now) results.push(await sendCampaign(def.key));
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
