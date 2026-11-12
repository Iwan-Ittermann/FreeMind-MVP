// Wedium welcome/access mail with a one-click login link (?p=passphrase).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "./email-template-store.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export async function sendWediumWelcome(supabase: SupabaseClient, to: string, passphrase: string, idempotencyKey: string) {
  const goUrl = `${SITE_URL}/wedium/go?p=${encodeURIComponent(passphrase)}`;
  const data = { passphrase, appUrl: SITE_URL, goUrl, weduimUrl: `${SITE_URL}/wedium`, wediumUrl: `${SITE_URL}/wedium`, faqUrl: `${SITE_URL}/fragen` };
  const tpl = await loadTemplate(supabase, "wedium-signup-welcome", data, {
    subject: "Willkommen beim wedium-Event!",
    heading: "Willkommen!",
    body: `Schön, dass du dabei bist! Vom {{eventDate}} diskutieren wir gemeinsam.\n\nDeine Passphrase: \`${passphrase}\`\n\n[Zur Diskussion](${goUrl})`,
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({ templateName: "wedium-signup-welcome", recipientEmail: to, idempotencyKey, templateData: { ...tpl, ...data } }),
  });
  if (!res.ok) console.error("wedium welcome mail failed:", res.status, await res.text());
}
