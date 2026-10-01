// Shared attribution + PostHog capture for the Gutefrage pre-registration.
// Never send emails, names, tokens or confirm URLs to PostHog.

export type Attribution = {
  post_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  is_test: boolean;
};

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 100);
  return /^[\w.\-~ ]+$/.test(s) && s ? s : null;
};

export function parseAttribution(raw: unknown): Attribution {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const utm_content = clean(r.utm_content);
  const post_id = utm_content ?? "unattributed";
  return {
    post_id,
    utm_source: clean(r.utm_source),
    utm_medium: clean(r.utm_medium),
    utm_campaign: clean(r.utm_campaign),
    utm_content,
    is_test: r.is_test === true || post_id === "tracking_test",
  };
}

export function cleanAnalyticsId(v: unknown): string | null {
  return typeof v === "string" && /^[\w\-]{8,80}$/.test(v) ? v : null;
}

export async function captureServer(
  event: string,
  distinctId: string,
  props: Record<string, unknown>,
  uuid?: string,
) {
  const key = Deno.env.get("POSTHOG_API_KEY");
  if (!key) return { ok: false, reason: "no_key" };
  const host = Deno.env.get("POSTHOG_REGION") === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        ...(uuid ? { uuid } : {}),
        properties: { ...props, $process_person_profile: false },
      }),
    });
    if (!res.ok) console.error(`PostHog ${event} failed [${res.status}]: ${await res.text()}`);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error(`PostHog ${event} error`, e);
    return { ok: false };
  }
}

export function eventProps(row: {
  post_id: string; utm_source: string | null; utm_medium: string | null;
  utm_campaign: string | null; utm_content: string | null; is_test: boolean;
}) {
  return {
    post_id: row.post_id,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    utm_content: row.utm_content,
    is_test: row.is_test,
    page: "gutefrage",
  };
}
