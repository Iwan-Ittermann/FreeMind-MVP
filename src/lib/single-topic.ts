/**
 * Single-topic event mode.
 *
 * When VITE_SINGLE_TOPIC_MODE=true, the whole app is locked to one topic:
 * - `/` renders the topic screen directly (skips Landing)
 * - Any short-code route that doesn't match SINGLE_TOPIC_SHORT_CODE redirects to `/`
 * - Header language switcher is hidden, i18n is locked to `de`
 * - Subscribed-topics section in the notification panel is hidden
 * - useTTTopics filters the topic list down to the configured topic
 *
 * Configure via `.env.local` on the event deploy:
 *   VITE_SINGLE_TOPIC_MODE=true
 *   VITE_SINGLE_TOPIC_SHORT_CODE=xxxx
 */
export const SINGLE_TOPIC_MODE =
  String(import.meta.env.VITE_SINGLE_TOPIC_MODE ?? '').toLowerCase() === 'true';

export const SINGLE_TOPIC_SHORT_CODE: string | null =
  ((import.meta.env.VITE_SINGLE_TOPIC_SHORT_CODE as string | undefined) ?? '')
    .toLowerCase()
    .trim() || null;
