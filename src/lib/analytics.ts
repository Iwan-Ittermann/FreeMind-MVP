import posthog from "posthog-js";

/**
 * Fire a PostHog event if PostHog is initialized (live domain only).
 * Safe to call anywhere — silently no-ops in preview/dev.
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  try {
    if (posthog.__loaded) {
      posthog.capture(event, properties);
    }
  } catch {
    // analytics must never break the app
  }
}
