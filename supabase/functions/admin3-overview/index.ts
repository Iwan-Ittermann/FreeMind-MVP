// Admin board for the wedium event participants (/admin3).
// Works exclusively on public.wedium_signups, wedium_campaign_sends and
// wedium_verified_participants. Guarded by ADMIN3_PASSWORD.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";
import { generatePassphrase, passphraseToEmail, passphraseToPassword } from "../_shared/passphrase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN3_PASSWORD = Deno.env.get("ADMIN3_PASSWORD") ?? "";
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
  "wedium-signup-confirm",
  "wedium-signup-welcome",
  "campaign-wedium-sogehts",
  "campaign-wedium-start",
  "campaign-wedium-final-day",
  "campaign-wedium-result",
  "wedium-nudge-opinion",
  "wedium-nudge-rate",
  "wedium-nudge-chat",
] as const;

const TRACKED_TEMPLATES = [...TEMPLATE_KEYS] as string[];

/** Latest mail status per wedium signup. */
async function emailMatrix() {
  const [{ data: signups }, { data: logs }] = await Promise.all([
    supabase.from("wedium_signups").select("id, email"),
    supabase
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at")
      .in("template_name", TRACKED_TEMPLATES)
      .order("created_at", { ascending: true }),
  ]);

  const byEmail: Record<string, Record<string, string>> = {};
  for (const row of logs ?? []) {
    const mail = String(row.recipient_email).trim().toLowerCase();
    if (row.status === "pending" && byEmail[mail]?.[row.template_name]) continue;
    (byEmail[mail] ??= {})[row.template_name] = String(row.status);
  }

  const matrix: Record<string, Record<string, string>> = {};
  for (const s of signups ?? []) {
    matrix[s.id as string] = { ...(byEmail[String(s.email).trim().toLowerCase()] ?? {}) };
  }

  const { data: opens } = await supabase
    .from("wedium_campaign_sends")
    .select("campaign_key, signup_id, opened_at")
    .not("opened_at", "is", null);
  for (const row of opens ?? []) {
    const target = matrix[row.signup_id as string];
    if (target) target[String(row.campaign_key)] = "opened";
  }
  return matrix;
}

async function callCampaignSender(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/wedium-campaign-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("wedium-campaign-emails failed:", res.status, text);
    throw new Error("campaign_send_failed");
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function sendTransactional(templateName: string, to: string, idempotencyKey: string, data: Record<string, unknown>, fallback: { subject: string; heading: string; body: string }) {
  const tpl = await loadTemplate(supabase, templateName, data, fallback);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName,
      recipientEmail: to,
      idempotencyKey,
      templateData: { ...tpl, ...data },
    }),
  });
  if (!res.ok) {
    console.error(`${templateName} send failed:`, res.status, await res.text());
    throw new Error("send_failed");
  }
}

async function resendSignupConfirm(signupId: string) {
  const { data: row } = await supabase
    .from("wedium_signups").select("id, email, confirmed_at").eq("id", signupId).maybeSingle();
  if (!row) throw new Error("signup_not_found");
  if (row.confirmed_at) return { skipped: "already_confirmed" };

  const token = generateToken();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("wedium_signups")
    .update({ confirm_token: token, confirm_token_expires_at: expires }).eq("id", row.id);
  if (error) throw error;

  const confirmUrl = `${SITE_URL}/wedium/confirm?token=${token}`;
  await sendTransactional("wedium-signup-confirm", String(row.email), `wedium-signup-confirm-resend-${token}`, { confirmUrl }, {
    subject: "Bestätige deine Anmeldung — wedium x freemind",
    heading: "Bestätige deine Anmeldung",
    body: `[Anmeldung bestätigen](${confirmUrl})`,
  });
  return { sent: true };
}

async function sendWelcome(signupId: string) {
  const { data: row } = await supabase
    .from("wedium_signups").select("id, email, confirmed_at, passphrase").eq("id", signupId).maybeSingle();
  if (!row) throw new Error("signup_not_found");
  if (!row.confirmed_at || !row.passphrase) return { skipped: "no_passphrase" };
  const data = {
    passphrase: row.passphrase,
    appUrl: SITE_URL,
    goUrl: `${SITE_URL}/wedium/go`,
    wediumUrl: `${SITE_URL}/wedium`,
    faqUrl: `${SITE_URL}/fragen`,
  };
  await sendTransactional("wedium-signup-welcome", String(row.email), `wedium-signup-welcome-admin-${row.id}-${Date.now()}`, data, {
    subject: "Willkommen beim wedium-Event!",
    heading: "Willkommen!",
    body: `Deine Passphrase: \`${row.passphrase}\`\n\n[Zur Diskussion](${SITE_URL}/wedium/go)`,
  });
  return { sent: true };
}

async function resendPassphrase(signupId: string) {
  const { data: row } = await supabase
    .from("wedium_signups").select("id, email, confirmed_at, passphrase").eq("id", signupId).maybeSingle();
  if (!row) throw new Error("signup_not_found");
  if (!row.confirmed_at || !row.passphrase) return { skipped: "no_passphrase" };
  const data = { passphrase: row.passphrase, appUrl: SITE_URL, goUrl: `${SITE_URL}/wedium/go` };
  await sendTransactional("wedium-signup-welcome", String(row.email), `wedium-passphrase-admin-${row.id}-${Date.now()}`, data, {
    subject: "Deine Passphrase für das wedium-Event",
    heading: "Deine Passphrase",
    body: `\`${row.passphrase}\`\n\n[Zur Diskussion](${SITE_URL}/wedium/go)`,
  });
  await supabase.from("wedium_signups")
    .update({ last_passphrase_sent_at: new Date().toISOString() }).eq("id", row.id);
  return { sent: true };
}

async function deleteSignup(signupId: string) {
  const { data: row } = await supabase
    .from("wedium_signups").select("id, auth_user_id").eq("id", signupId).maybeSingle();
  if (!row) throw new Error("signup_not_found");
  if (row.auth_user_id) {
    const { error } = await supabase.auth.admin.deleteUser(row.auth_user_id as string);
    if (error) console.error("auth deleteUser failed:", error.message);
  }
  const { error } = await supabase.from("wedium_signups").delete().eq("id", row.id);
  if (error) throw error;
  return { deleted: true };
}

async function banEmail(signupId: string, reason?: string) {
  const { data: row } = await supabase
    .from("wedium_signups").select("id, email, auth_user_id").eq("id", signupId).maybeSingle();
  if (!row) throw new Error("signup_not_found");
  const cleanEmail = String(row.email).toLowerCase();
  const { error: banErr } = await supabase
    .from("banned_emails").upsert({ email: cleanEmail, reason: reason ?? null }, { onConflict: "email" });
  if (banErr) throw banErr;
  if (row.auth_user_id) {
    const { error } = await supabase.auth.admin.deleteUser(row.auth_user_id as string);
    if (error) console.error("auth deleteUser failed:", error.message);
  }
  await supabase.from("wedium_signups").delete().eq("id", row.id);
  return { banned: cleanEmail };
}

/** Copies signups from the old list into the wedium list (fresh wedium passphrases). */
async function importLegacy(fromDate: string) {
  const { data: legacy } = await supabase
    .from("signups")
    .select("email, created_at, confirmed_at, signup_ip")
    .gte("created_at", fromDate);
  const { data: existing } = await supabase.from("wedium_signups").select("email");
  const taken = new Set((existing ?? []).map((r) => String(r.email).toLowerCase()));

  let imported = 0;
  for (const row of legacy ?? []) {
    const email = String(row.email).split("#")[0].toLowerCase();
    if (!email || taken.has(email)) continue;

    const insert: Record<string, unknown> = {
      email,
      created_at: row.created_at,
      signup_ip: row.signup_ip ?? null,
    };

    if (row.confirmed_at) {
      const phrase = generatePassphrase();
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: passphraseToEmail(phrase, "wedium"),
        password: passphraseToPassword(phrase),
        email_confirm: true,
        user_metadata: { scope: "wedium" },
      });
      if (error || !created?.user) {
        console.error("import: createUser failed", error?.message);
        continue;
      }
      insert.confirmed_at = row.confirmed_at;
      insert.passphrase = phrase;
      insert.passphrase_issued_at = new Date().toISOString();
      insert.auth_user_id = created.user.id;

      const { data: inserted, error: insErr } = await supabase
        .from("wedium_signups").insert(insert).select("id").single();
      if (insErr || !inserted) {
        console.error("import: insert failed", insErr?.message);
        continue;
      }
      await supabase.from("wedium_verified_participants")
        .upsert({ user_id: created.user.id, signup_id: inserted.id }, { onConflict: "user_id" });
    } else {
      const { error: insErr } = await supabase.from("wedium_signups").insert(insert);
      if (insErr) {
        console.error("import: insert failed", insErr.message);
        continue;
      }
    }
    taken.add(email);
    imported++;
  }
  return { imported };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const { password, action, signupId, ipPassword, key, subject, heading, body_md, reason } = body ?? {};
    if (typeof password !== "string" || !ADMIN3_PASSWORD || !ctEq(password, ADMIN3_PASSWORD)) {
      return Response.json({ ok: false, error: "invalid_password" }, { status: 401, headers: corsHeaders });
    }

    if (action === "resend_signup") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await resendSignupConfirm(signupId)) }, { headers: corsHeaders });
    }
    if (action === "resend_welcome") {
      if (typeof signupId !== "string") return Response.json({ ok: false, error: "invalid_signup_id" }, { status: 400, headers: corsHeaders });
      return Response.json({ ok: true, ...(await sendWelcome(signupId)) }, { headers: corsHeaders });
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
    if (action === "send_campaign_now") {
      if (typeof key !== "string") return Response.json({ ok: false, error: "invalid_key" }, { status: 400, headers: corsHeaders });
      const out = await callCampaignSender({ campaignKey: key, force: true, resend: body.resend === true });
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }
    if (action === "resend_campaign") {
      if (typeof key !== "string" || typeof signupId !== "string") {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const out = await callCampaignSender({ campaignKey: key, signupId, force: true, resend: true });
      return Response.json({ ok: true, ...out }, { headers: corsHeaders });
    }
    if (action === "import_legacy") {
      const fromDate = typeof body?.fromDate === "string" && body.fromDate ? body.fromDate : "2026-09-01";
      return Response.json({ ok: true, ...(await importLegacy(fromDate)) }, { headers: corsHeaders });
    }
    if (action === "email_matrix") {
      return Response.json({ ok: true, matrix: await emailMatrix() }, { headers: corsHeaders });
    }
    if (action === "campaign_stats") {
      const { data } = await supabase.from("wedium_campaign_sends").select("campaign_key, opened_at");
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
      if (!(TEMPLATE_KEYS as unknown as string[]).includes(String(key))) {
        return Response.json({ ok: false, error: "invalid_key" }, { status: 400, headers: corsHeaders });
      }
      if (typeof subject !== "string" || typeof heading !== "string" || typeof body_md !== "string") {
        return Response.json({ ok: false, error: "invalid_payload" }, { status: 400, headers: corsHeaders });
      }
      const { error } = await supabase.from("email_templates")
        .upsert({ key, subject, heading, body_md }, { onConflict: "key" });
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "reveal_ips") {
      if (typeof ipPassword !== "string" || !ADMIN_IP_PASSWORD || !ctEq(ipPassword, ADMIN_IP_PASSWORD)) {
        return Response.json({ ok: false, error: "invalid_ip_password" }, { status: 401, headers: corsHeaders });
      }
      const { data } = await supabase.from("wedium_signups").select("id, signup_ip");
      const map: Record<string, string | null> = {};
      for (const r of data ?? []) map[r.id as string] = r.signup_ip ? String(r.signup_ip) : null;
      return Response.json({ ok: true, ips: map }, { headers: corsHeaders });
    }
    if (action === "list_bans") {
      const { data } = await supabase
        .from("banned_emails").select("email, banned_at, reason").order("banned_at", { ascending: false });
      return Response.json({ ok: true, bans: data ?? [] }, { headers: corsHeaders });
    }
    if (action === "unban_email") {
      if (typeof body?.email !== "string") return Response.json({ ok: false, error: "invalid_email" }, { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("banned_emails").delete().eq("email", body.email.toLowerCase());
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }
    if (action === "polarization_stats") {
      const { data: signups } = await supabase
        .from("wedium_signups").select("auth_user_id").not("auth_user_id", "is", null);
      const ids = (signups ?? []).map((s) => s.auth_user_id as string);
      if (ids.length === 0) return Response.json({ ok: true, polarization: [] }, { headers: corsHeaders });
      const { data } = await supabase
        .from("polarization_responses")
        .select("wave, least_liked_score, most_liked_score, user_id")
        .in("user_id", ids);
      const byWave: Record<string, { count: number; least: number[]; most: number[] }> = {};
      for (const r of data ?? []) {
        const w = String(r.wave);
        (byWave[w] ??= { count: 0, least: [], most: [] });
        byWave[w].count++;
        if (typeof r.least_liked_score === "number") byWave[w].least.push(r.least_liked_score);
        if (typeof r.most_liked_score === "number") byWave[w].most.push(r.most_liked_score);
      }
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
      const polarization = Object.entries(byWave).map(([wave, v]) => ({
        wave, count: v.count, avgLeast: avg(v.least), avgMost: avg(v.most),
      }));
      return Response.json({ ok: true, polarization }, { headers: corsHeaders });
    }

    // Default: overview
    const { data: signups, error } = await supabase
      .from("wedium_signups")
      .select("id, email, created_at, confirmed_at, passphrase")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ ok: true, signups: signups ?? [] }, { headers: corsHeaders });
  } catch (err) {
    console.error("admin3-overview error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
