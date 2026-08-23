// Generates the daily discussion report (AI summary + metrics), stores it in
// public.daily_reports (shown on /bericht). Mailing lives in send-daily-brief.
//
// Auth: service role bearer token (pg_cron job and admin2-overview).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

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

/** Berlin calendar date (YYYY-MM-DD) for a given instant. */
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
  // Determine the Berlin UTC offset for that date (CET/CEST).
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

interface ReportStats {
  opinionsTotal: number;
  opinionsNew: number;
  chatsNew: number;
  messagesNew: number;
  ratingsNew: number;
  activeChats: number;
}

/** Resolves the real event topic id from app_settings (the /test topic is excluded). */
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

async function collect(date: string) {
  const { start, end } = berlinDayWindow(date);
  const topicId = await eventTopicId();

  const opinionQuery = supabase
    .from("opinions")
    .select("id, text, created_at, visible")
    .order("created_at", { ascending: true });
  const chatQuery = supabase.from("chats").select("id, title, opinion_a_id, opinion_b_id, created_at");
  if (topicId) {
    opinionQuery.eq("topic_id", topicId);
    chatQuery.eq("topic_id", topicId);
  }

  const [opinionsRes, chatsRes, messagesRes, ratingsRes] = await Promise.all([
    opinionQuery,
    chatQuery,
    supabase
      .from("chat_messages")
      .select("id, chat_id, sender_id, content, created_at, visible")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_ratings")
      .select("chat_id, empathy, disagreement, created_at")
      .gte("created_at", start)
      .lt("created_at", end),
  ]);

  const opinions = (opinionsRes.data ?? []).filter((o) => o.visible !== false);
  const opinionById = new Map(opinions.map((o) => [o.id as string, String(o.text ?? "")]));
  const chats = chatsRes.data ?? [];
  const chatById = new Map(chats.map((c) => [c.id as string, c]));
  const topicChatIds = new Set(chats.map((c) => String(c.id)));
  const messages = (messagesRes.data ?? [])
    .filter((m) => m.visible !== false)
    .filter((m) => topicChatIds.has(String(m.chat_id)));
  const ratings = (ratingsRes.data ?? []).filter((r) => topicChatIds.has(String(r.chat_id)));

  const stats: ReportStats = {
    opinionsTotal: opinions.length,
    opinionsNew: opinions.filter((o) => String(o.created_at) >= start && String(o.created_at) < end).length,
    chatsNew: chats.filter((c) => String(c.created_at) >= start && String(c.created_at) < end).length,
    messagesNew: messages.length,
    ratingsNew: ratings.length,
    activeChats: new Set(messages.map((m) => m.chat_id as string)).size,
  };


  // Build a compact transcript grouped by chat, with opinion labels instead of names.
  const byChat = new Map<string, typeof messages>();
  for (const m of messages) {
    const list = byChat.get(m.chat_id as string) ?? [];
    list.push(m);
    byChat.set(m.chat_id as string, list);
  }

  const sections: string[] = [];
  for (const [chatId, msgs] of byChat) {
    const chat = chatById.get(chatId);
    const a = short(opinionById.get(String(chat?.opinion_a_id)) ?? "Meinung A");
    const b = short(opinionById.get(String(chat?.opinion_b_id)) ?? "Meinung B");
    const lines = msgs.slice(0, 40).map((m) => `- ${short(String(m.content ?? ""), 400)}`);
    sections.push(
      `Diskussion "${chat?.title ?? "ohne Titel"}"\nPosition A: ${a}\nPosition B: ${b}\nNachrichten:\n${lines.join("\n")}`,
    );
  }

  const newOpinionTexts = opinions
    .filter((o) => String(o.created_at) >= start && String(o.created_at) < end)
    .map((o) => `- ${short(String(o.text ?? ""), 300)}`);

  return { stats, sections, newOpinionTexts };
}

async function summarise(
  date: string,
  stats: ReportStats,
  sections: string[],
  newOpinionTexts: string[],
): Promise<string> {
  if (!LOVABLE_API_KEY || (sections.length === 0 && newOpinionTexts.length === 0)) {
    return sections.length === 0 && newOpinionTexts.length === 0
      ? "An diesem Tag gab es keine neuen Meinungen und keine Diskussionen."
      : "Zusammenfassung konnte nicht erzeugt werden.";
  }

  const prompt = [
    `Erstelle einen redaktionellen Tagesbericht für den ${date} über die Diskussionen auf der Plattform freemind.`,
    "",
    `Kennzahlen: ${stats.opinionsNew} neue Meinungen, ${stats.chatsNew} neue Diskussionen, ${stats.messagesNew} Nachrichten, ${stats.ratingsNew} Bewertungen.`,
    "",
    newOpinionTexts.length ? `Neue Meinungen:\n${newOpinionTexts.join("\n")}` : "",
    "",
    sections.length ? `Diskussionen des Tages:\n\n${sections.join("\n\n")}` : "",
    "",
    "Schreibe 3 bis 6 kurze Absätze auf Deutsch:",
    "- Worüber wurde gestritten? Welche Hauptlinien gab es?",
    "- Wo entstand Annäherung oder Verständnis?",
    "- Nutze 2 bis 4 kurze wörtliche Zitate aus den Nachrichten, in Anführungszeichen.",
    "Nenne keine Namen oder E-Mail-Adressen. Sachlich, freundlich, ohne Überschriften, ohne Aufzählungszeichen.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Du bist eine sorgfältige Redakteurin für Diskussionsberichte." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.error("AI gateway failed:", res.status, await res.text());
    return "Zusammenfassung konnte nicht erzeugt werden.";
  }
  const json = await res.json();
  return String(json?.choices?.[0]?.message?.content ?? "").trim() || "Zusammenfassung konnte nicht erzeugt werden.";
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Only service-role callers (pg_cron / admin function) may trigger this.
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }
  const token = auth.slice("Bearer ".length).trim();
  if (token !== SERVICE_ROLE && jwtRole(token) !== "service_role") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403, headers: corsHeaders });
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
    const regenerate = payload.regenerate !== false;

    const { data: existing } = await supabase
      .from("daily_reports")
      .select("id, title, body_md, stats")
      .eq("report_date", date)
      .maybeSingle();

    let title = existing?.title ?? `Tagesbericht ${date}`;
    let body = existing?.body_md ?? "";
    let stats = (existing?.stats ?? {}) as ReportStats;

    if (!existing || regenerate) {
      const collected = await collect(date);
      stats = collected.stats;
      body = await summarise(date, collected.stats, collected.sections, collected.newOpinionTexts);
      title = `Tagesbericht ${new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}`;

      const { error } = await supabase
        .from("daily_reports")
        .upsert({ report_date: date, title, body_md: body, stats }, { onConflict: "report_date" });
      if (error) throw error;
    }

    // Mailing moved to send-daily-brief; this function only generates /bericht content.
    return Response.json({ ok: true, date, title, stats, sent: 0, failed: 0 }, { headers: corsHeaders });
  } catch (err) {
    console.error("generate-daily-report error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
