// Sends each participant one short, personal daily brief (21:00 Berlin):
// your day, new opinions, a surprising encounter, top 5, winner of the day.
// Scope: the real event topic only (never the /test topic).
//
// Auth: service role bearer token (pg_cron job and admin2-overview).

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

function berlinDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** UTC window [start, end) covering the given Berlin calendar day. */
function berlinDayWindow(date: string): { start: string; end: string } {
  const probe = new Date(`${date}T12:00:00Z`);
  const tzName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "shortOffset",
  }).format(probe);
  const match = tzName.match(/GMT([+-]\d+)/);
  const offset = match ? Number(match[1]) : 2;
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const sign = offset >= 0 ? "+" : "-";
  const start = new Date(`${date}T00:00:00${sign}${pad(offset)}:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function short(text: string, max = 90): string {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function cleanEmail(raw: string): string {
  return String(raw).split("#")[0].toLowerCase();
}

/** Resolves the real event topic id from app_settings. */
async function eventTopicId(): Promise<string | null> {
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "real_topic_short_code")
    .maybeSingle();
  const code = setting?.value ? String(setting.value) : null;
  if (!code) return null;
  const { data: topic } = await supabase
    .from("topics")
    .select("id")
    .eq("short_code", code)
    .maybeSingle();
  return topic?.id ? String(topic.id) : null;
}

interface Snapshot {
  /** total bridging points per opinion */
  totals: Map<string, number>;
  /** points gained today per opinion */
  gains: Map<string, number>;
  opinionText: Map<string, string>;
  opinionOwner: Map<string, string>;
  ownOpinionOf: Map<string, string>;
  newOpinions: Array<{ id: string; text: string }>;
  messagesByUser: Map<string, number>;
  /** one surprising encounter per opinion involved */
  surprises: Array<{ a: string; b: string; quote: string; diff: number; respect: number }>;
}

async function snapshot(topicId: string, date: string): Promise<Snapshot> {
  const { start, end } = berlinDayWindow(date);

  const [opinionsRes, chatsRes, eventsRes, oppRatingsRes, directedRes] = await Promise.all([
    supabase.from("opinions").select("id, user_id, text, created_at, visible").eq("topic_id", topicId),
    supabase.from("chats").select("id, opinion_a_id, opinion_b_id").eq("topic_id", topicId),
    supabase
      .from("rating_events")
      .select("rater_id, kind, target_opinion_id, value, created_at, chat_id")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true }),
    supabase
      .from("opinion_ratings")
      .select("rater_opinion_id, target_opinion_id, disagreement")
      .eq("topic_id", topicId),
    supabase.rpc("get_topic_directed_pairs", { _topic_id: topicId }),
  ]);

  const opinions = (opinionsRes.data ?? []).filter((o) => o.visible !== false);
  const opinionText = new Map<string, string>();
  const opinionOwner = new Map<string, string>();
  const ownOpinionOf = new Map<string, string>();
  for (const o of opinions) {
    opinionText.set(String(o.id), String(o.text ?? ""));
    opinionOwner.set(String(o.id), String(o.user_id));
    ownOpinionOf.set(String(o.user_id), String(o.id));
  }

  const chatIds = (chatsRes.data ?? []).map((c) => String(c.id));
  const chatById = new Map((chatsRes.data ?? []).map((c) => [String(c.id), c]));

  const { data: messages } = chatIds.length
    ? await supabase
      .from("chat_messages")
      .select("chat_id, sender_id, content, created_at, visible")
      .in("chat_id", chatIds)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
    : { data: [] as Array<Record<string, unknown>> };

  const todayMessages = (messages ?? []).filter((m) => (m as { visible?: boolean }).visible !== false);
  const messagesByUser = new Map<string, number>();
  for (const m of todayMessages) {
    const uid = String((m as { sender_id: string }).sender_id);
    messagesByUser.set(uid, (messagesByUser.get(uid) ?? 0) + 1);
  }

  // Totals: authoritative, same formula the graph uses (respect × difference).
  const totals = new Map<string, number>();
  for (const row of (directedRes.data ?? []) as Array<Record<string, unknown>>) {
    const pts = Number(row.empathy ?? 0) * Number(row.disagreement ?? 0);
    const target = String(row.target_opinion_id);
    totals.set(target, (totals.get(target) ?? 0) + pts);
  }

  // Daily gains: replay the rating event log and sum today's deltas per target.
  const fallbackDiff = new Map<string, number>();
  for (const r of oppRatingsRes.data ?? []) {
    fallbackDiff.set(
      `${String(r.rater_opinion_id)}|${String(r.target_opinion_id)}`,
      Number(r.disagreement ?? 5),
    );
  }
  const diffByPair = new Map<string, number>();
  const lastProduct = new Map<string, number>();
  const gains = new Map<string, number>();
  const surpriseCandidates: Array<{ rater: string; target: string; respect: number; diff: number; chatId: string | null }> = [];

  for (const e of (eventsRes.data ?? []) as Array<Record<string, unknown>>) {
    const rater = String(e.rater_id);
    const target = String(e.target_opinion_id);
    const key = `${rater}|${target}`;
    const value = Number(e.value ?? 0);
    const at = String(e.created_at);

    if (String(e.kind) === "difference") {
      diffByPair.set(key, value);
      continue;
    }
    if (String(e.kind) !== "understanding") continue;

    const raterOpinion = ownOpinionOf.get(rater);
    const diff = diffByPair.get(key)
      ?? (raterOpinion ? fallbackDiff.get(`${raterOpinion}|${target}`) : undefined)
      ?? 5;
    const respect = value / 10;
    const product = respect * diff;
    const delta = product - (lastProduct.get(key) ?? 0);
    lastProduct.set(key, product);

    if (at >= start && at < end) {
      gains.set(target, (gains.get(target) ?? 0) + delta);
      if (respect >= 6 && diff >= 5) {
        surpriseCandidates.push({ rater, target, respect, diff, chatId: e.chat_id ? String(e.chat_id) : null });
      }
    }
  }

  const newOpinions = opinions
    .filter((o) => String(o.created_at) >= start && String(o.created_at) < end)
    .map((o) => ({ id: String(o.id), text: String(o.text ?? "") }));

  // Surprising encounters: high difference met with high respect today.
  const quoteFor = (chatId: string | null): string => {
    if (!chatId) return "";
    const msg = todayMessages.find((m) => String((m as { chat_id: string }).chat_id) === chatId);
    return msg ? short(String((msg as { content: string }).content ?? ""), 110) : "";
  };
  const surprises = surpriseCandidates
    .sort((a, b) => b.respect * b.diff - a.respect * a.diff)
    .slice(0, 2)
    .map((c) => {
      const raterOpinion = ownOpinionOf.get(c.rater);
      let chatId = c.chatId;
      if (!chatId && raterOpinion) {
        const chat = (chatsRes.data ?? []).find((ch) =>
          (String(ch.opinion_a_id) === raterOpinion && String(ch.opinion_b_id) === c.target) ||
          (String(ch.opinion_b_id) === raterOpinion && String(ch.opinion_a_id) === c.target)
        );
        chatId = chat ? String(chat.id) : null;
      }
      return {
        a: short(opinionText.get(raterOpinion ?? "") ?? "eine Meinung", 60),
        b: short(opinionText.get(c.target) ?? "eine Meinung", 60),
        quote: quoteFor(chatId),
        diff: c.diff,
        respect: c.respect,
      };
    })
    .filter((s) => !!s.quote || !!s.b);

  // Keep chatById referenced for clarity of intent (chat lookup above uses raw list).
  void chatById;

  return {
    totals,
    gains,
    opinionText,
    opinionOwner,
    ownOpinionOf,
    newOpinions,
    messagesByUser,
    surprises,
  };
}

function buildBody(
  snap: Snapshot,
  opts: { ownOpinionId: string | null; unread: number; goUrl: string; berichtUrl: string },
): { body: string; yourDay: string } {
  const lines: string[] = [];

  const ranked = [...snap.totals.entries()]
    .filter(([id]) => snap.opinionText.has(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const ownId = opts.ownOpinionId;
  const ownGain = ownId ? Math.round(snap.gains.get(ownId) ?? 0) : 0;
  const ownMessages = ownId ? (snap.messagesByUser.get(snap.opinionOwner.get(ownId) ?? "") ?? 0) : 0;

  // 1. Your day
  let yourDay: string;
  if (ownGain > 0 || ownMessages > 0) {
    const parts: string[] = [];
    if (ownGain > 0) parts.push(`**${ownGain} Brückenpunkte** dazubekommen`);
    if (ownMessages > 0) parts.push(`**${ownMessages} Nachrichten** geschrieben`);
    yourDay = `Heute hast du ${parts.join(" und ")}.`;
  } else {
    yourDay = "Heute war es still bei dir — eine einzige Antwort reicht, um wieder Punkte zu sammeln.";
  }
  if (opts.unread > 0) yourDay += ` ${opts.unread} ungelesen.`;
  lines.push(yourDay);

  // 2. New opinions
  if (snap.newOpinions.length) {
    lines.push("**Neu heute**");
    lines.push(snap.newOpinions.slice(0, 3).map((o) => `- ${short(o.text, 100)}`).join("\n"));
  }

  // 3. Surprising encounter
  if (snap.surprises.length) {
    lines.push("**Überraschende Begegnung**");
    for (const s of snap.surprises) {
      lines.push(
        `- „${s.a}" und „${s.b}" liegen weit auseinander — und haben sich trotzdem verstanden${s.quote ? `: „${s.quote}"` : "."}`,
      );
    }
  }

  // 4. Top 5
  if (ranked.length) {
    lines.push("**Top 5**");
    lines.push(
      ranked.slice(0, 5).map(([id, pts], i) =>
        `${i + 1}. ${short(snap.opinionText.get(id) ?? "", 70)} — ${Math.round(pts)}${id === ownId ? " (du)" : ""}`
      ).join("\n"),
    );
    if (ownId) {
      const idx = ranked.findIndex(([id]) => id === ownId);
      if (idx >= 5) {
        const ahead = ranked[4]?.[1] ?? 0;
        const mine = ranked[idx]?.[1] ?? 0;
        lines.push(
          `Du stehst auf Platz ${idx + 1} mit ${Math.round(mine)} Punkten — ${Math.max(1, Math.round(ahead - mine))} hinter Platz 5.`,
        );
      }
    }
  }

  // 5. Winner of the day
  const winner = [...snap.gains.entries()]
    .filter(([id, v]) => v > 0 && snap.opinionText.has(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (winner) {
    lines.push(
      `**Tagessieger:** ${short(snap.opinionText.get(winner[0]) ?? "", 80)} — **+${Math.round(winner[1])}** heute.`,
    );
  }

  lines.push(`[Weiter diskutieren](${opts.goUrl})`);
  lines.push(`Ausführlicher Tagesbericht: [freemind.chat/bericht](${opts.berichtUrl})`);

  return { body: lines.join("\n\n"), yourDay };
}

async function run(date: string, resend: boolean, onlySignupId?: string) {
  const topicId = await eventTopicId();
  if (!topicId) return { date, sent: 0, failed: 0, skipped: 0, error: "no_event_topic" };

  const snap = await snapshot(topicId, date);

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

  const userIds = (signups ?? []).map((s) => String(s.auth_user_id));
  const unreadByUser = new Map<string, number>();
  if (userIds.length) {
    const { data: unread } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("topic_id", topicId)
      .is("read_at", null)
      .in("user_id", userIds);
    for (const n of unread ?? []) {
      const uid = String(n.user_id);
      unreadByUser.set(uid, (unreadByUser.get(uid) ?? 0) + 1);
    }
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const s of signups ?? []) {
    const email = cleanEmail(String(s.email));
    if (blocked.has(email)) {
      skipped++;
      continue;
    }
    const uid = String(s.auth_user_id);
    const ownOpinionId = snap.ownOpinionOf.get(uid) ?? null;

    const { body, yourDay } = buildBody(snap, {
      ownOpinionId,
      unread: unreadByUser.get(uid) ?? 0,
      goUrl: `${SITE_URL}/go`,
      berichtUrl: `${SITE_URL}/bericht`,
    });

    const data = {
      briefDate: date,
      briefBody: body,
      briefYourDay: yourDay,
      goUrl: `${SITE_URL}/go`,
      berichtUrl: `${SITE_URL}/bericht`,
      appUrl: SITE_URL,
    };

    const tpl = await loadTemplate(supabase, "daily-brief", data, {
      subject: "Dein Tag bei freemind",
      heading: "Dein Tag",
      body: "{{briefBody}}",
    });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: "daily-brief",
        recipientEmail: email,
        idempotencyKey: resend
          ? `daily-brief-${date}-${s.id}-${Date.now()}`
          : `daily-brief-${date}-${s.id}`,
        templateData: { ...tpl, ...data },
      }),
    });

    if (!res.ok) {
      failed++;
      console.error("daily-brief send failed:", email, res.status, await res.text());
      continue;
    }
    sent++;
  }

  return { date, sent, failed, skipped };
}

/** Renders the brief without sending, for admin preview. */
async function preview(date: string, signupId?: string) {
  const topicId = await eventTopicId();
  if (!topicId) return { error: "no_event_topic" };
  const snap = await snapshot(topicId, date);

  let ownOpinionId: string | null = null;
  if (signupId) {
    const { data } = await supabase.from("signups").select("auth_user_id").eq("id", signupId).maybeSingle();
    const uid = data?.auth_user_id ? String(data.auth_user_id) : null;
    ownOpinionId = uid ? (snap.ownOpinionOf.get(uid) ?? null) : null;
  }
  const { body } = buildBody(snap, {
    ownOpinionId,
    unread: 0,
    goUrl: `${SITE_URL}/go`,
    berichtUrl: `${SITE_URL}/bericht`,
  });
  return { date, body };
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
    const date = typeof payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)
      ? payload.date
      : berlinDate();
    const signupId = typeof payload.signupId === "string" ? payload.signupId : undefined;

    if (payload.preview === true) {
      const out = await preview(date, signupId);
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }

    const result = await run(date, payload.resend === true, signupId);
    return Response.json({ ok: true, ...result }, { headers: corsHeaders });
  } catch (err) {
    console.error("send-daily-brief error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
