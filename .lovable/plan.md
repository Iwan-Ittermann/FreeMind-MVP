# Email flow: welcome mail + 4 scheduled campaign mails, editable in /admin2

## Current state

- Two editable templates exist in the database: `signup-confirm` and `signup-passphrase`. Both are edited in /admin2 and rendered through the shared template store.
- After a user clicks the confirmation link, `signup-confirm` provisions the passphrase and sends the passphrase mail plus an admin notification. There is no separate welcome mail.
- 11 signups are confirmed today.
- There is no scheduled/date-based mail sending yet.

## What gets built

### 1. Five new editable emails

New template keys, each with subject / heading / body, all editable in /admin2:

| Key | When it goes out |
|---|---|
| `signup-welcome` | immediately after the user confirms the double-opt-in link |
| `campaign-prepare` | 19.08.2026, 00:01 |
| `campaign-soft-launch` | 20.08.2026, 00:01 |
| `campaign-start` | 23.08.2026, 00:01 |
| `campaign-final-day` | 29.08.2026, 00:01 |

Times are interpreted as Berlin local time. Each mail is written in German with sensible default text you can then edit in /admin2. Available placeholders per mail: passphrase, link to the discussion, FAQ link.

Recipients for the four dated mails: every confirmed signup that has not been banned, deleted, or suppressed (bounces). Each recipient gets their own individually queued mail, and every mail is sent at most once per person per campaign, so retries or a re-run cannot duplicate.

### 2. Scheduling

A small sender is triggered on a schedule and checks whether a campaign is due. When a campaign's send date has passed and a given recipient has not yet received it, that mail is queued. This makes the sends resilient: nothing is lost if the exact minute is missed, and no duplicates occur.

/admin2 also gets a manual "Jetzt senden" per campaign (with confirmation) and a per-signup resend, so you keep full control and can test with your own address first.

### 3. /admin2 email editor becomes collapsible

The E-Mail-Vorlagen section turns into a list of collapsed rows (one per mail) showing the mail's label, its trigger/date and its subject line. Clicking a row expands the editor for that mail. All rows collapsed by default, so the page stays scannable with seven templates. Each campaign row also shows how many recipients have already received it.

### 4. Signups table

Adds a compact resend control per row for the new mails (welcome + each campaign), next to the existing Bestätigung / Passphrase / Löschen / Bannen actions.

## Technical notes

- Migration: insert the five new rows into `email_templates` with German default content; add a `campaign_sends` table (campaign key, signup id, sent timestamp, unique on key+signup) for once-per-person guarantees, with grants and RLS locked to service role.
- Migration: `pg_cron` job (hourly, or every 15 min) calling a new `send-campaign-emails` edge function via `pg_net` with the service role key from Vault, following the existing email-queue pattern. Job scheduled in UTC with Berlin offset accounted for (00:01 CEST = 22:01 UTC previous day); the due-date check inside the function is the real gate.
- `send-campaign-emails`: resolves due campaigns from a date table, loads the editable template via `loadTemplate`, filters recipients against `banned_emails` and `suppressed_emails`, and enqueues one `send-transactional-email` call per recipient with idempotency key `<campaign>-<signupId>`.
- New React Email components under `supabase/functions/_shared/transactional-email-templates/` for the five mails, registered in `registry.ts`, styled like the existing signup mails.
- `signup-confirm`: after the passphrase mail, send `signup-welcome` (own idempotency key).
- `admin2-overview`: extend `TEMPLATE_KEYS` with the five new keys, add `send_campaign_now`, `campaign_stats`, and `resend_campaign` actions.
- `Admin2.tsx`: template section rewritten as collapsible rows; campaign metadata (label, date, placeholders) kept in one map.
- Deploy `send-campaign-emails`, `signup-confirm`, `admin2-overview`, `send-transactional-email` afterwards.
