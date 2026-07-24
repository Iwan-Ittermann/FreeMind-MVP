## Goal

Two transactional emails, all text editable from `/admin2`, plus expanded per-row actions (resend each mail, delete user, ban email) and IP logging gated behind a second admin password.

## 1. The two emails


| Key                 | Trigger                                     | Purpose                                                |
| ------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `signup-confirm`    | `signup-request` submits an email           | Verify the email address (click confirm link) — exists |
| `signup-passphrase` | `signup-confirm` completes, or admin resend | Deliver passphrase + how to use it — exists            |
| &nbsp;              | &nbsp;                                      | &nbsp;                                                 |


`signup-admin-notify` (internal admin ping) stays as-is and is not exposed as editable.

## 2. Editable templates in /admin2

New table `email_templates`:

- `key` (pk, one of the three above)
- `subject` (text)
- `body_md` (text, plain text / light markdown)
- `updated_at`
- Seeded on migration with current German copy from the existing `.tsx` templates.

Rendering strategy: the two `.tsx` template files become thin wrappers that receive `{ subject, body }` from the send-side. `send-transactional-email` stays unchanged; instead, `signup-request` and`signup-confirm` fetch the row from `email_templates`, interpolate `{{confirmUrl}}` / `{{passphrase}}` / `{{appUrl}}` / `{{email}}` placeholders, and pass the final `subject` + `bodyHtml` (from markdown-to-HTML with a tiny converter — paragraphs, links, `**bold**`) into a single generic `custom-text` React Email template. Brand chrome (eyebrow, heading font, container) stays in the wrapper; only the body prose is user-editable.

Admin UI additions in `Admin2.tsx`:

- New "Emails" section above the signups table.
- Three cards (one per key) with `Subject` input and `Body` textarea, "Placeholders available: …" hint, `Save` button.
- Reads/writes via `admin2-overview` with new actions `get_templates` and `save_template`.

## 3. Signups table — new actions

Extend `admin2-overview` with actions:

- `resend_signup` (exists) — resends confirm email.
- `resend_passphrase` — resends passphrase (only if confirmed & passphrase exists).
- `delete_signup` — deletes signup + linked `verified_participants` + `auth.users` row (cascade via service role).
- `ban_email` — inserts into new `banned_emails` table and deletes the signup.
- `reveal_ips` — accepts the IP password (see §5) and returns `{ id → ip_address }` map.

New columns in the signups table UI (in this order): Email · Angemeldet · Bestätigt · IP (hidden) · Resend confirm · Resend passphrase · Delete · Ban.

## 4. Ban list

New table `banned_emails (email text pk, banned_at timestamptz default now(), reason text)`.
`signup-request` rejects with `status: "banned"` when `lower(email)` is present.
Managed only via admin (no public policies).

## 5. IP logging behind a second password

- Add `signup_ip inet` column to `signups`.
- `signup-request` reads client IP from `x-forwarded-for` / `cf-connecting-ip` and stores it on insert (and on token reissue).
- New secret `ADMIN_IP_PASSWORD` (added via `secrets--add_secret`, user enters value in secure form).
- IP column in `/admin2` shows `••••` by default with a small "Reveal" button; clicking opens an inline password prompt. The admin function only returns IPs when that password matches (constant-time compare, separate from `ADMIN_PASSWORD`). No IPs are ever returned in the default overview payload.



## Technical section

### Migration

```sql
CREATE TABLE public.email_templates (
  key text PRIMARY KEY,
  subject text NOT NULL,
  body_md text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
-- no public policies: admin-only via service role

CREATE TABLE public.banned_emails (
  email text PRIMARY KEY,
  banned_at timestamptz NOT NULL DEFAULT now(),
  reason text
);
GRANT ALL ON public.banned_emails TO service_role;
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.signups ADD COLUMN signup_ip inet;
-- seed email_templates with current copy (3 rows)
```

### Files touched

- Migration (above).
- `secrets--add_secret` for `ADMIN_IP_PASSWORD`.
- `supabase/functions/_shared/transactional-email-templates/`:
  - new `custom-text.tsx` (generic wrapper, takes `{ subject, bodyHtml, ctaUrl?, ctaLabel? }`).
  - &nbsp;
  - update `registry.ts`.
- `supabase/functions/_shared/render-email-body.ts` — tiny md→HTML + placeholder interpolation helper.
- `supabase/functions/signup-request/index.ts` — read template, ban check, capture IP.
- `supabase/functions/signup-confirm/index.ts` — read passphrase template.
- &nbsp;
- `supabase/functions/admin2-overview/index.ts` — new actions: `get_templates`, `save_template`, `resend_passphrase`, `delete_signup`, `ban_email`, `reveal_ips` (guarded by `ADMIN_IP_PASSWORD`).
- `src/pages/Admin2.tsx` — Emails editor section; new action buttons; hidden IP column with reveal flow.

### Placeholders per template

- `signup-confirm`: `{{confirmUrl}}`
- `signup-passphrase`: `{{passphrase}}`, `{{appUrl}}`
- &nbsp;

Unknown placeholders render literally so admins get instant feedback if they mistype.  
--> unsubscribe confirmation email was droped and scrubbed from the plan. <--