import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generatePassphrase,
  passphraseToEmail,
  passphraseToPassword,
} from "../_shared/passphrase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_NOTIFY_EMAIL = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "iwan@freemind.chat";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function notifyAdmin(signupEmail: string, confirmedAt: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-admin-notify",
      recipientEmail: ADMIN_NOTIFY_EMAIL,
      idempotencyKey: `signup-admin-${signupEmail}-${confirmedAt}`,
      templateData: { email: signupEmail, confirmedAt },
    }),
  });
  if (!res.ok) console.error("Admin notify failed:", res.status, await res.text());
}

async function sendPassphraseEmail(to: string, passphrase: string, issuedAt: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "signup-passphrase",
      recipientEmail: to,
      idempotencyKey: `signup-passphrase-${to}-${issuedAt}`,
      templateData: { passphrase, appUrl: SITE_URL },
    }),
  });
  if (!res.ok) console.error("passphrase email failed:", res.status, await res.text());
}

async function provisionAuthUser(): Promise<{ passphrase: string; userId: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const phrase = generatePassphrase();
    const email = passphraseToEmail(phrase);
    const password = passphraseToPassword(phrase);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (!error && data.user) {
      return { passphrase: phrase, userId: data.user.id };
    }
    // If email/passphrase collides, retry with a new phrase.
    if (error && !/already/i.test(error.message)) {
      console.error("createUser error:", error.message);
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (typeof token !== "string" || token.length < 10 || token.length > 128) {
      return Response.json({ status: "invalid" }, { status: 400, headers: corsHeaders });
    }

    const { data: row } = await supabase
      .from("signups")
      .select("id, email, confirmed_at, confirm_token_expires_at, passphrase, passphrase_issued_at")
      .eq("confirm_token", token)
      .maybeSingle();

    if (!row) return Response.json({ status: "invalid" }, { headers: corsHeaders });

    const cleanEmail = row.email.replace(/#test-[a-f0-9]+$/, "");

    // Already confirmed — just resend the passphrase (if we have one) and return.
    if (row.confirmed_at) {
      if (row.passphrase && row.passphrase_issued_at) {
        await sendPassphraseEmail(cleanEmail, row.passphrase, row.passphrase_issued_at);
        await supabase.from("signups")
          .update({ last_passphrase_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      }
      return Response.json({ status: "already_confirmed", email: cleanEmail }, { headers: corsHeaders });
    }

    if (!row.confirm_token_expires_at || new Date(row.confirm_token_expires_at) < new Date()) {
      return Response.json({ status: "expired", email: cleanEmail }, { headers: corsHeaders });
    }

    // Provision auth user + passphrase.
    const provisioned = await provisionAuthUser();
    if (!provisioned) {
      return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
    }

    const confirmedAt = new Date().toISOString();
    const issuedAt = confirmedAt;

    const { error: updateErr } = await supabase.from("signups").update({
      confirmed_at: confirmedAt,
      confirm_token: null,
      confirm_token_expires_at: null,
      passphrase: provisioned.passphrase,
      passphrase_issued_at: issuedAt,
      auth_user_id: provisioned.userId,
      last_passphrase_sent_at: confirmedAt,
    }).eq("id", row.id);
    if (updateErr) throw updateErr;

    // Link auth user to this signup as a verified participant.
    const { error: vpErr } = await supabase
      .from("verified_participants")
      .insert({ user_id: provisioned.userId, signup_id: row.id });
    if (vpErr) console.error("verified_participants insert:", vpErr.message);

    await sendPassphraseEmail(cleanEmail, provisioned.passphrase, issuedAt);
    await notifyAdmin(cleanEmail, confirmedAt);

    return Response.json({ status: "ok", email: cleanEmail }, { headers: corsHeaders });
  } catch (err) {
    console.error("signup-confirm error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
