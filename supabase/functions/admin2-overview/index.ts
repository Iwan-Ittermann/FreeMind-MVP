import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const ADMIN_IP_PASSWORD = Deno.env.get("ADMIN_IP_PASSWORD") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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

const TEMPLATE_KEYS = [
  "signup-confirm",
  "signup-welcome",
  "campaign-soft-launch",
  "campaign-start",
  "campaign-final-day",
  "campaign-sogehts",
  "daily-report",
  "daily-brief",
  "nudge-opinion",
  "nudge-rate",
  "nudge-chat",

] as const;
type TemplateKey = typeof TEMPLATE_KEYS[number];

// Mails tracked in the per-user checkmark grid (includes the retired passphrase mail).
const TRACKED_TEMPLATES = [
  "signup-confirm",
  "signup-passphrase",
  "signup-welcome",
  "campaign-soft-launch",
  "campaign-start",
  "campaign-final-day",
  "campaign-sogehts",
  "daily-report",
  "daily-brief",
];

/** Latest status per (recipient email, template), keyed by signup id. */
async function emailMatrix() {
  const [{ data: signups }, { data: logs }] = await Promise.all([
    supabase.from("signups").select("id, email"),
    supabase
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at")
      .in("template_name", TRACKED_TEMPLATES)
      .order("created_at", { ascending: true }),
  ]);

  // recipient email -> template -> status (last write wins = latest row)
  const byEmail: Record<string, Record<string, string>> = {};
  for (const row of logs ?? []) {
    const mail = String(row.recipient_email).trim().toLowerCase();
    if (row.status === "pending" && byEmail[mail]?.[row.template_name]) continue;
    (byEmail[mail] ??= {})[row.template_name] = String(row.status);
  }

  const matrix: Record<string, Record<string, string>> = {};
  for (const s of signups ?? []) {
    const mail = String(s.email).split("#")[0].trim().toLowerCase();
    matrix[s.id] = { ...(byEmail[mail] ?? {}) };
  }

  // Campaign opens (tracking pixel) upgrade a "sent" mark to "opened".
  const { data: opens } = await supabase
    .from("campaign_sends")
    .select("campaign_key, signup_id, opened_at")
    .not("opened_at", "is", null);
  for (const row of opens ?? []) {
    const target = matrix[row.signup_id as string];
    if (target) target[String(row.campaign_key)] = "opened";
  }
  return matrix;
}


async function callCampaignSender(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("send-campaign-emails failed:", res.status, text);
    throw new Error("campaign_send_failed");
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function sendWelcome(signupId: string) {
  const { data: row } = await supabase
    .from("signups")
    .select("id, email, confirmed_at, passphrase")
    .eq("id", signupId)
    .maybeSingle();
  if (!row) throw new Error("signup_not_found");
  if (!row.confirmed_at) return { skipped: "not_confirmed" };
  const cleanEmail = String(row.email).split("#")[0];
  const data = {
    passphrase: row.passphrase ?? "",
    appUrl: SITE_URL,
    goUrl: `${SITE_URL}/go`,
    faqUrl: `${SITE_URL}/fragen`,
  };
  const tpl = await loadTemplate(supabase, "signup-welcome", data, {
    subject: "Willkommen bei freemind!",
    heading: "Willkommen!",
    body: `Schön, dass du dabei bist!\n\n[${SITE_URL}/go](${SITE_URL}/go)`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-welcome",
      recipientEmail: cleanEmail,
      idempotencyKey: `signup-welcome-admin-${row.id}-${Date.now()}`,
      templateData: { ...tpl, ...data },
    }),
  });
  if (!res.ok) throw new Error("send_failed");
  return { sent: true };
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
  const confirmUrl = `${SITE_URL}/confirm?token=${token}`;
  const tpl = await loadTemplate(supabase, "signup-confirm", { confirmUrl }, {
    subject: "Bestätige deine Anmeldung bei freemind",
    heading: "Bestätige deine Anmeldung",
    body: `[Anmeldung bestätigen](${confirmUrl})`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-confirm",
      recipientEmail: cleanEmail,
      idempotencyKey: `signup-confirm-resend-${token}`,
      templateData: { ...tpl, confirmUrl },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("resend send-transactional-email failed:", res.status, body);
    throw new Error("send_failed");
  }
  return { sent: true };
}

async function resendPassphrase(signupId: string) {
  const { data: row, error } = await supabase
    .from("signups")
    .select("id, email, confirmed_at, passphrase, passphrase_issued_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error || !row) throw new Error("signup_not_found");
  if (!row.confirmed_at || !row.passphrase) return { skipped: "no_passphrase" };

  const cleanEmail = String(row.email).split("#")[0];
  const issuedAt = row.passphrase_issued_at ?? new Date().toISOString();
  const tpl = await loadTemplate(supabase, "signup-passphrase", {
    passphrase: row.passphrase,
    appUrl: SITE_URL,
  }, {
    subject: "Deine Passphrase für freemind",
    heading: "Deine Passphrase",
    body: `\`${row.passphrase}\`\n\n[${SITE_URL}](${SITE_URL})`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-passphrase",
      recipientEmail: cleanEmail,
      idempotencyKey: `signup-passphrase-admin-${row.id}-${Date.now()}`,
      templateData: { ...tpl, passphrase: row.passphrase, appUrl: SITE_URL },
    }),
  });
  if (!res.ok) throw new Error("send_failed");
  await supabase.from("signups")
    .update({ last_passphrase_sent_at: new Date().toISOString() })
    .eq("id", row.id);
  return { sent: true };
}

async function deleteSignup(signupId: string) {
  const { data: row } = await supabase
    .from("signups")
    .select("id, email, auth_user_id")
    .eq("id", signupId)
    .maybeSingle();
  if (!row) throw new Error("signup_not_found");
  // verified_participants cascades on signup delete. Delete auth user first.
  if (row.auth_user_id) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(row.auth_user_id);
    if (authErr) console.error("auth deleteUser failed:", authErr.message);
  }
  const { error } = await supabase.from("signups").delete().eq("id", row.id);
  if (error) throw error;
  return { deleted: true };
}

async function banEmail(signupId: string, reason?: string) {
  const { data: row } = await supabase
    .from("signups")
    .select("id, email, auth_user_id")
    .eq("id", signupId)
    .maybeSingle();
  if (!row) throw new Error("signup_not_found");
  const cleanEmail = String(row.email).split("#")[0].toLowerCase();
  const { error: banErr } = await supabase
    .from("banned_emails")
    .upsert({ email: cleanEmail, reason: reason ?? null }, { onConflict: "email" });
  if (banErr) throw banErr;
  if (row.auth_user_id) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(row.auth_user_id);
    if (authErr) console.error("auth deleteUser failed:", authErr.message);
  }
  await supabase.from("signups").delete().eq("id", row.id);
  return { banned: cleanEmail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const { password, action, signupId, ipPassword, key, subject, heading, body_md, reason } = body ?? {};
    if (typeof password !== "string" || !ADMIN_PASSWORD || !ctEq(password, ADMIN_PASSWORD)) {
      return Response.json({ ok: false, error: "invalid_password" }, { status: 401, headers: corsHeaders });
    }

    if (action === "resend_signup") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await resendSignupConfirm(signupId)) }, { headers: corsHeaders });
    }
    if (action === "resend_passphrase") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await resendPassphrase(signupId)) }, { headers: corsHeaders });
    }
    if (action === "delete_signup") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await deleteSignup(signupId)) }, { headers: corsHeaders });
    }
    if (action === "ban_email") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await banEmail(signupId, typeof reason === "string" ? reason : undefined)) }, { headers: corsHeaders });
    }
    if (action === "resend_welcome") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await sendWelcome(signupId)) }, { headers: corsHeaders });
    }
    if (action === "send_campaign_now") {
      if (typeof key !== "string") return Response.json({ ok: false, error: "invalid_key" }, { status: 400, headers: corsHeaders });
      const resendAll = body.resend === true;
      const out = await callCampaignSender({ campaignKey: key, force: true, resend: resendAll });
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }
    if (action === "resend_campaign") {
      if (typeof key !== "string" || typeof signupId !== "string") {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const out = await callCampaignSender({ campaignKey: key, signupId, force: true, resend: true });
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }

    if (action === "list_reports") {
      const { data } = await supabase
        .from("daily_reports")
        .select("id, report_date, title, body_md, stats, created_at, updated_at")
        .order("report_date", { ascending: false });
      return Response.json({ ok: true, reports: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "report_opt_ins") {
      const { count } = await supabase
        .from("signups")
        .select("id", { count: "exact", head: true })
        .eq("daily_report_opt_in", true)
        .not("confirmed_at", "is", null);
      return Response.json({ ok: true, optIns: count ?? 0 }, { headers: corsHeaders });
    }
    if (action === "send_daily_brief") {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-daily-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({
          date: typeof body?.date === "string" ? body.date : undefined,
          resend: body?.resend === true,
          preview: body?.preview === true,
          signupId: typeof signupId === "string" ? signupId : undefined,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("send-daily-brief failed:", res.status, text);
        throw new Error("brief_failed");
      }
      let out: Record<string, unknown> = {};
      try {
        out = JSON.parse(text);
      } catch { /* ignore */ }
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }

    if (action === "generate_report") {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-daily-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({
          date: typeof body?.date === "string" ? body.date : undefined,
          regenerate: body?.regenerate !== false,
          send: body?.send === true,
          resend: body?.resend === true,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("generate-daily-report failed:", res.status, text);
        throw new Error("report_failed");
      }
      let out: Record<string, unknown> = {};
      try {
        out = JSON.parse(text);
      } catch { /* ignore */ }
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }

    if (action === "email_matrix") {
      return Response.json({ ok: true, matrix: await emailMatrix() }, { headers: corsHeaders });
    }
    if (action === "campaign_stats") {
      const { data } = await supabase.from("campaign_sends").select("campaign_key, opened_at");
      const counts: Record<string, number> = {};
      const opens: Record<string, number> = {};
      for (const r of data ?? []) {
        const k = String(r.campaign_key);
        counts[k] = (counts[k] ?? 0) + 1;
        if (r.opened_at) opens[k] = (opens[k] ?? 0) + 1;
      }
      return Response.json({ ok: true, counts, opens }, { headers: corsHeaders });
    }
    if (action === "get_templates") {
      const { data } = await supabase
        .from("email_templates")
        .select("key, subject, heading, body_md, updated_at")
        .in("key", TEMPLATE_KEYS as unknown as string[])
        .order("key");
      return Response.json({ ok: true, templates: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "save_template") {
      if (!TEMPLATE_KEYS.includes(key as TemplateKey)) {
        return Response.json({ ok: false, error: "invalid_key" }, { status: 400, headers: corsHeaders });
      }
      if (typeof subject !== "string" || typeof heading !== "string" || typeof body_md !== "string") {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const { error } = await supabase.from("email_templates").upsert({
        key, subject, heading, body_md,
      }, { onConflict: "key" });
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "reveal_ips") {
      if (typeof ipPassword !== "string" || !ADMIN_IP_PASSWORD || !ctEq(ipPassword, ADMIN_IP_PASSWORD)) {
        return Response.json({ ok: false, error: "invalid_ip_password" }, { status: 401, headers: corsHeaders });
      }
      const { data } = await supabase
        .from("signups")
        .select("id, signup_ip");
      const map: Record<string, string | null> = {};
      for (const r of (data ?? [])) map[r.id] = r.signup_ip ? String(r.signup_ip) : null;
      return Response.json({ ok: true, ips: map }, { headers: corsHeaders });
    }
    if (action === "list_bans") {
      const { data } = await supabase
        .from("banned_emails")
        .select("email, banned_at, reason")
        .order("banned_at", { ascending: false });
      return Response.json({ ok: true, bans: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "unban_email") {
      if (typeof body?.email !== "string") return Response.json({ ok: false, error: "invalid_email" }, { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("banned_emails").delete().eq("email", body.email.toLowerCase());
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "list_faq") {
      const { data, error } = await supabase
        .from("faq_items")
        .select("id, question, answer, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return Response.json({ ok: true, faq: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "save_faq") {
      const { id, question, answer, sort_order } = body ?? {};
      if (typeof question !== "string" || typeof answer !== "string") {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const row: Record<string, unknown> = {
        question,
        answer,
        sort_order: Number.isFinite(sort_order) ? Number(sort_order) : 0,
      };
      if (typeof id === "string" && id) row.id = id;
      const { error } = await supabase.from("faq_items").upsert(row);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "list_questions") {
      const { data, error } = await supabase
        .from("question_submissions")
        .select("id, question, email, ai_draft, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Response.json({ ok: true, questions: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "set_question_status") {
      const { id, status } = body ?? {};
      if (typeof id !== "string" || !["new", "answered", "archived"].includes(String(status))) {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const { error } = await supabase.from("question_submissions").update({ status }).eq("id", id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "delete_question") {
      if (typeof body?.id !== "string") return Response.json({ ok: false, error: "invalid_id" }, { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("question_submissions").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "polarization_stats") {
      const { data, error } = await supabase
        .from("polarization_responses")
        .select("wave, least_liked_score, most_liked_score");
      if (error) throw error;
      const waves: Record<string, { count: number; least: number; most: number }> = {};
      for (const r of data ?? []) {
        const k = String(r.wave);
        waves[k] ??= { count: 0, least: 0, most: 0 };
        waves[k].count += 1;
        waves[k].least += Number(r.least_liked_score ?? 0);
        waves[k].most += Number(r.most_liked_score ?? 0);
      }
      const stats = Object.entries(waves).map(([wave, v]) => ({
        wave,
        count: v.count,
        avgLeast: v.count ? Math.round((v.least / v.count) * 10) / 10 : 0,
        avgMost: v.count ? Math.round((v.most / v.count) * 10) / 10 : 0,
      }));
      return Response.json({ ok: true, polarization: stats }, { headers: corsHeaders });
    }
    if (action === "delete_faq") {
      if (typeof body?.id !== "string") return Response.json({ ok: false, error: "invalid_id" }, { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("faq_items").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "list_tutorial_steps") {
      const { data, error } = await supabase
        .from("tutorial_steps")
        .select("id, sort_order, text, highlight, is_active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return Response.json({ ok: true, steps: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "save_tutorial_step") {
      const { id, text, highlight, sort_order, is_active } = body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const allowed = ["none", "difference", "chat"];
      const row: Record<string, unknown> = {
        text: text.trim().slice(0, 500),
        highlight: allowed.includes(String(highlight)) ? String(highlight) : "none",
        sort_order: Number.isFinite(sort_order) ? Number(sort_order) : 0,
        is_active: is_active !== false,
      };
      if (typeof id === "string" && id) row.id = id;
      const { error } = await supabase.from("tutorial_steps").upsert(row);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "delete_tutorial_step") {
      if (typeof body?.id !== "string") return Response.json({ ok: false, error: "invalid_id" }, { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("tutorial_steps").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }



    // Default: overview
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
