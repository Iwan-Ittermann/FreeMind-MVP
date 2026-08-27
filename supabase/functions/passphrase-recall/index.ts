import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/email-template-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://freemind.chat";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

/** Throttle: at most one recall mail per address every 5 minutes. */
const THROTTLE_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cleaned = String((body as { email?: unknown }).email ?? "").trim().toLowerCase();
    if (!isValidEmail(cleaned)) {
      return Response.json({ status: "error", reason: "invalid_email" }, { status: 400, headers: corsHeaders });
    }

    const { data: row } = await supabase
      .from("signups")
      .select("id, email, confirmed_at, passphrase, last_passphrase_sent_at")
      .ilike("email", cleaned)
      .maybeSingle();

    // Always answer the same way — no email enumeration.
    const ok = Response.json({ status: "ok" }, { headers: corsHeaders });

    if (!row?.confirmed_at || !row.passphrase) return ok;

    const last = row.last_passphrase_sent_at ? new Date(row.last_passphrase_sent_at).getTime() : 0;
    if (Date.now() - last < THROTTLE_MS) return ok;

    const recipient = String(row.email).split("#")[0];
    const tpl = await loadTemplate(supabase, "signup-passphrase", {
      passphrase: row.passphrase,
      appUrl: `${SITE_URL}/go`,
    }, {
      subject: "Deine Passphrase für freemind",
      heading: "Deine Passphrase",
      body: `Hier ist deine Passphrase:\n\n\`${row.passphrase}\`\n\nEs braucht nur einen Satz von dir, damit jemand anders die Welt kurz anders sieht.\n\n[Zur Diskussion](${SITE_URL}/go)`,
    });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: "signup-passphrase",
        recipientEmail: recipient,
        idempotencyKey: `passphrase-recall-${row.id}-${Math.floor(Date.now() / THROTTLE_MS)}`,
        templateData: { ...tpl, passphrase: row.passphrase, appUrl: `${SITE_URL}/go` },
      }),
    });
    if (!res.ok) {
      console.error("passphrase-recall send failed:", res.status, await res.text());
      return ok;
    }

    await supabase.from("signups")
      .update({ last_passphrase_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    return ok;
  } catch (err) {
    console.error("passphrase-recall error:", err);
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders });
  }
});
