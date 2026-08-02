# Signups table: per-mail checkmarks, compact actions, passphrase moves to "Prepare"

## Current state

- `/admin2` signups table has 4 visible buttons per row (Bestätigung, Passphrase, Löschen, Bannen) plus a resend dropdown with 7 entries.
- There are 7 mails: Verifizierung, Passphrase, Willkommen, Prepare, Soft launch, Start today, Final day.
- `email_send_log` already records every send with `template_name` + `recipient_email` + status, so who-got-what is derivable per user.
- `campaign_sends` records the four dated mails per signup.

## What changes

### 1. Checkmark grid per user

Each signup row gets one small column per mail (short headers: Verif · Willk · Prep · Soft · Start · Final) showing:

- green check = sent
- red cross = send failed / bounced / suppressed
- grey dash = not sent to this person

This makes it visible at a glance that e.g. someone who registered after 19.08. never got "Prepare". Data comes from the actual send log (deduplicated per mail per recipient, latest status wins), so it reflects reality rather than assumptions.

### 2. Compact actions

- The "Bestätigung" and "Passphrase" buttons are removed from the row; both mails stay resendable via the existing dropdown + "Senden".
- "Löschen" and "Bannen" become icons hidden behind a "⋯" (more) toggle per row, so destructive actions need one extra click. Both keep their confirmation prompt.

### 3. Passphrase mail dropped, passphrase moves into "Prepare"

- The standalone "Passphrase" mail (mail no. 2) is no longer sent after DOI confirmation. Only the Willkommen mail goes out then.
- The "Prepare" mail (19.08., 00:01) carries the passphrase. Its default German body is updated to include the passphrase block and login hint; the text stays fully editable in /admin2.
- The Passphrase template row is removed from the /admin2 template list; the resend option is kept in the row dropdown as a manual fallback (useful if someone loses their passphrase before 19.08.).
- Mail numbering in the template list is renumbered: 1. Verifizierung, 2. Willkommen, 3. Prepare (mit Passphrase), 4. Soft launch, 5. Start today, 6. Final day.

Note: users who confirm before 19.08. will then have no passphrase in their inbox until that date. The manual per-user resend covers exceptions.

## Technical notes

- `admin2-overview`: new `email_matrix` action returning, per signup id, a map `template_name -> status`, built from `email_send_log` grouped by lowercased recipient email and template, keeping the latest row per (recipient, template). Included in the initial parallel load in `Admin2.tsx`.
- `Admin2.tsx`: add `MAIL_COLUMNS` (key + short label) driving the new checkmark columns; add `openMoreRow` state for the per-row "⋯" disclosure; drop the two dedicated resend buttons; keep `RESENDABLE` unchanged.
- `TEMPLATE_META`: remove `signup-passphrase`, renumber labels, update `campaign-prepare` label to "Prepare (mit Passphrase)".
- `admin2-overview` `TEMPLATE_KEYS`: drop `signup-passphrase` so it disappears from the editor list (row-level `resend_passphrase` action stays).
- `signup-confirm`: remove the passphrase-mail send (keep passphrase generation and storage, keep the welcome mail and admin notify).
- Data update: rewrite the `campaign-prepare` row in `email_templates` to include the passphrase; template body for `signup-passphrase` stays in the table for the manual resend path.
- Redeploy `admin2-overview` and `signup-confirm`.
