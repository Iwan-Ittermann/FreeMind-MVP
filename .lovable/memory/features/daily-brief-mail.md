---
name: Daily Brief Mail
description: One short personal daily mail (21:00 Berlin) replacing the notification digest and the report mail
type: feature
---

- Edge function `send-daily-brief`, pg_cron `send-daily-brief` at 19:00 UTC (21:00 Berlin).
- Content order: Dein Tag (points gained + own messages + unread count) → Neu heute (max 3 opinions) → Überraschende Begegnung (high difference + high respect, short quote) → Top 5 (own entry marked, own rank if outside) → Tagessieger (largest point gain today) → Button to `/go`, link to `/bericht`.
- Scope is always the real event topic only (`app_settings.real_topic_short_code` → `topics.short_code`). The `/test` topic never appears in mails or in `/bericht`.
- Opt-in column: `signups.notification_digest_opt_in` (default true). `daily_report_opt_in` is no longer used for sending. The bell panel has exactly one mail toggle.
- `generate-daily-report` only generates `daily_reports` for `/bericht` (23:30 Berlin); it sends no mail.
- Template key `daily-brief` (editable in /admin2, placeholders `{{briefBody}}`, `{{briefYourDay}}`). Admin actions: preview, send now, resend for a date (`admin2-overview` action `send_daily_brief`).
- Points formula matches the graph: respect(0-10) × difference; daily gain = delta of that product from today's `rating_events`.
- In-app nudges (`TTNudgeHint`) auto-dismiss after 20 s, remember dismissal per stage in `sessionStorage`, and suppress the home-screen install hint while visible.
