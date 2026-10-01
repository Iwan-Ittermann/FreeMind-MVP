import posthog from "posthog-js";
import { trackEvent } from "@/lib/analytics";

const KEY = "freemind_gf_attr";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export type GfAttribution = {
  post_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  is_test: boolean;
};

/** URL params win; otherwise reuse the session's earlier attribution. Never guessed. */
export function readGfAttribution(): GfAttribution {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = UTM.some((k) => params.get(k));
  if (fromUrl) {
    const a = Object.fromEntries(UTM.map((k) => [k, params.get(k) || null])) as Record<string, string | null>;
    const post_id = a.utm_content ?? "unattributed";
    const attr: GfAttribution = {
      post_id,
      utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign, utm_content: a.utm_content,
      is_test: params.get("is_test") === "true" || post_id === "tracking_test",
    };
    try { sessionStorage.setItem(KEY, JSON.stringify(attr)); } catch { /* ignore */ }
    return attr;
  }
  try {
    const s = sessionStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return {
    post_id: "unattributed", utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
    is_test: params.get("is_test") === "true",
  };
}

/** Anonymous PostHog id (no personal data) to link visit and signup. */
export function getAnalyticsId(): string | null {
  try { return posthog.__loaded ? posthog.get_distinct_id() : null; } catch { return null; }
}

let lastViewKey: string | null = null;
/** Fires once per real page load/navigation, immune to React re-renders and StrictMode. */
export function trackGfLandingView(navKey: string) {
  const k = `${performance.timeOrigin}:${navKey}`;
  if (lastViewKey === k) return;
  lastViewKey = k;
  trackEvent("gf_landing_view", { ...readGfAttribution(), page: "gutefrage" });
}
