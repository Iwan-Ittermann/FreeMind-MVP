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

export async function loadTemplate(
  supabase: SupabaseClient,
  key: string,
  data: Record<string, string | undefined>,
  fallback: RenderedTemplate,
): Promise<RenderedTemplate> {
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
