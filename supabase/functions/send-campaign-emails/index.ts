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

function cleanEmail(raw: string): string {
  return String(raw).split("#")[0].toLowerCase();
}

async function loadRecipients(campaignKey: string, onlySignupId?: string): Promise<Recipient[]> {
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

  return (signups ?? [])
    .map((s) => ({ id: s.id as string, email: cleanEmail(s.email as string), passphrase: (s.passphrase as string | null) ?? null }))
    .filter((s) => !blocked.has(s.email) && !sentIds.has(s.id));
}

async function sendCampaign(campaignKey: string, onlySignupId?: string) {
  const def = getCampaign(campaignKey);
  if (!def) throw new Error("unknown_campaign");

  const recipients = await loadRecipients(campaignKey, onlySignupId);
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const data = {
      passphrase: r.passphrase ?? "",
      appUrl: SITE_URL,
      goUrl: `${SITE_URL}/go`,
      testUrl: `${SITE_URL}/test`,
      faqUrl: `${SITE_URL}/faq`,
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
        idempotencyKey: `${campaignKey}-${r.id}`,
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

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
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

    const results: unknown[] = [];

    if (campaignKey) {
      const def = getCampaign(campaignKey);
      if (!def) return Response.json({ ok: false, error: "unknown_campaign" }, { status: 400, headers: corsHeaders });
      if (!force && new Date(def.dueAt) > new Date()) {
        return Response.json({ ok: true, skipped: "not_due" }, { headers: corsHeaders });
      }
      results.push(await sendCampaign(campaignKey, signupId));
    } else {
      const now = new Date();
      for (const def of CAMPAIGNS) {
        if (new Date(def.dueAt) <= now) results.push(await sendCampaign(def.key));
      }
    }

    return Response.json({ ok: true, results }, { headers: corsHeaders });
  } catch (err) {
    console.error("send-campaign-emails error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
