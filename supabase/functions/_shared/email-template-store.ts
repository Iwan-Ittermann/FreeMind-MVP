// Shared helper: fetch an editable email template row and interpolate placeholders.
// Used by signup-request and signup-confirm edge functions.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RenderedTemplate {
  subject: string;
  heading: string;
  body: string;
}

function interpolate(text: string, data: Record<string, string | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? `{{${k}}}`);
}

/** Which independent event context a template belongs to (each has its own admin panel). */
export function templateScope(key: string): "wedium" | "gutefrage" | "main" {
  if (key.includes("wedium")) return "wedium";
  if (key.includes("gutefrage")) return "gutefrage";
  return "main";
}

/** Reads {{eventQuestion}} / {{eventDate}} for a context from app_settings. */
export async function loadEventTokens(supabase: SupabaseClient, scope: "wedium" | "gutefrage" | "main") {
  const keys = scope === "gutefrage"
    ? ["gutefrage_question", "gutefrage_event_date"]
    : [`${scope}_question_de`, `${scope}_date_de`];
  const { data } = await supabase.from("app_settings").select("key, value").in("key", keys);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value.trim()]));
  return {
    eventQuestion: (m[keys[0]] || undefined) as string | undefined,
    eventDate: (m[keys[1]] || undefined) as string | undefined,
  };
}

export async function loadTemplate(
  supabase: SupabaseClient,
  key: string,
  rawData: Record<string, string | undefined>,
  fallback: RenderedTemplate,
): Promise<RenderedTemplate> {
  const data = { ...(await loadEventTokens(supabase, templateScope(key))), ...rawData };
  const { data: row, error } = await supabase
    .from("email_templates")
    .select("subject, heading, body_md")
    .eq("key", key)
    .maybeSingle();
  if (error || !row) {
    return {
      subject: interpolate(fallback.subject, data),
      heading: interpolate(fallback.heading, data),
      body: interpolate(fallback.body, data),
    };
  }
  return {
    subject: interpolate(row.subject, data),
    heading: interpolate(row.heading, data),
    body: interpolate(row.body_md, data),
  };
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
