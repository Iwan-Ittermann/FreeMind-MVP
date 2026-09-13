// Confirms a wedium signup: provisions a wedium-scoped auth account
// (passphrase → *@wedium.local) and sends the wedium welcome mail.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generatePassphrase,
  passphraseToEmail,
  passphraseToPassword,
} from "../_shared/passphrase.ts";
import { loadTemplate } from "../_shared/email-template-store.ts";

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
      idempotencyKey: `wedium-signup-admin-${signupEmail}-${confirmedAt}`,
      templateData: { email: `${signupEmail} (wedium)`, confirmedAt },
    }),
  });
  if (!res.ok) console.error("Admin notify failed:", res.status, await res.text());
}

export async function sendWediumWelcome(to: string, passphrase: string, idempotencyKey: string) {
  const data = {
    passphrase,
    appUrl: SITE_URL,
    goUrl: `${SITE_URL}/wedium/go`,
    weduimUrl: `${SITE_URL}/wedium`,
    faqUrl: `${SITE_URL}/fragen`,
  };
  const tpl = await loadTemplate(supabase, "wedium-signup-welcome", data, {
    subject: "Willkommen beim wedium-Event!",
    heading: "Willkommen!",
    body:
      `Schön, dass du dabei bist! Vom 10.–14. Oktober diskutieren wir gemeinsam.\n\nDeine Passphrase: \`${passphrase}\`\n\n[Zur Diskussion](${SITE_URL}/wedium/go)`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({
      templateName: "wedium-signup-welcome",
      recipientEmail: to,
      idempotencyKey,
      templateData: { ...tpl, ...data },
    }),
  });
  if (!res.ok) console.error("wedium welcome mail failed:", res.status, await res.text());
}

/** Creates a wedium-scoped auth account. */
export async function provisionWediumUser(): Promise<{ passphrase: string; userId: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const phrase = generatePassphrase();
    const { data, error } = await supabase.auth.admin.createUser({
      email: passphraseToEmail(phrase, "wedium"),
      password: passphraseToPassword(phrase),
      email_confirm: true,
      user_metadata: { scope: "wedium" },
    });
    if (!error && data.user) return { passphrase: phrase, userId: data.user.id };
    if (error && !/already/i.test(error.message)) console.error("createUser error:", error.message);
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
      .from("wedium_signups")
      .select("id, email, confirmed_at, confirm_token_expires_at")
      .eq("confirm_token", token)
      .maybeSingle();
    if (!row) return Response.json({ status: "invalid" }, { headers: corsHeaders });

    if (row.confirmed_at) {
      return Response.json({ status: "already_confirmed", email: row.email }, { headers: corsHeaders });
    }
    if (!row.confirm_token_expires_at || new Date(row.confirm_token_expires_at) < new Date()) {
      return Response.json({ status: "expired", email: row.email }, { headers: corsHeaders });
    }

    const provisioned = await provisionWediumUser();
    if (!provisioned) return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });

    const confirmedAt = new Date().toISOString();
    const { error: updateErr } = await supabase.from("wedium_signups").update({
      confirmed_at: confirmedAt,
      confirm_token: null,
      confirm_token_expires_at: null,
      passphrase: provisioned.passphrase,
      passphrase_issued_at: confirmedAt,
      auth_user_id: provisioned.userId,
    }).eq("id", row.id);
    if (updateErr) throw updateErr;

    const { error: vpErr } = await supabase
      .from("wedium_verified_participants")
      .upsert({ user_id: provisioned.userId, signup_id: row.id }, { onConflict: "user_id" });
    if (vpErr) console.error("wedium_verified_participants:", vpErr.message);

    await sendWediumWelcome(String(row.email), provisioned.passphrase, `wedium-signup-welcome-${row.id}-${confirmedAt}`);
    await notifyAdmin(String(row.email), confirmedAt);

    return Response.json({ status: "ok", email: row.email }, { headers: corsHeaders });
  } catch (err) {
    console.error("wedium-signup-confirm error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
