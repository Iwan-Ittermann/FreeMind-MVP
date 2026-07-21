
## Goal

For the event build (`/7mm9`), tie every passphrase to exactly one confirmed email address. Anonymous visitors can still browse the graph, but posting an opinion, chatting, or rating requires an email-verified passphrase. Registration stays open after the event has started, closing only shortly before the end.

## Flow after the change

```text
Landing form (email)
       │
       ▼
signup-request  ── stores signup row, sends confirm link ──▶ inbox
       │                                                        │
       │◀───────────── user clicks link ────────────────────────┘
       ▼
Confirm page (/confirm)
       │  invokes signup-confirm
       ▼
signup-confirm
  ├─ If new confirm: generate passphrase, store on signup, provision auth user
  ├─ If already confirmed: reuse stored passphrase
  ├─ Email passphrase to user (idempotent)
  └─ Notify admin (existing)
       │
       ▼
User receives passphrase email → pastes on /7mm9 → participates
```

## Data model changes

`public.signups` gets three new columns:
- `passphrase` (text, nullable) — plaintext, protected by deny-all RLS (only service role reads it, matching the existing table policy).
- `passphrase_issued_at` (timestamptz).
- `auth_user_id` (uuid, nullable) — links to the `auth.users` row deterministically created from the passphrase.

New table `public.verified_participants`:
- `user_id` (PK, references `auth.users`)
- `signup_id` (unique, references `signups`)
- `verified_at`

Purpose: server-side flag used by RLS/RPCs to distinguish an email-verified auth user from a silent anonymous one. `service_role` writes; `authenticated` may `SELECT` only its own row. A SECURITY DEFINER helper `public.is_verified_participant(uuid)` mirrors `has_role`.

New row in `public.app_settings`:
- `registration_cutoff_at` (timestamptz) — configurable in `/admin2`.

## Backend

**signup-request**
- Unchanged for brand-new emails.
- If email already confirmed AND `passphrase` exists AND cutoff not passed: re-send the passphrase email (throttled — max 1 per 10 min per email via a small `last_sent_at` column) and return `status: "resent"`. No new token, no new passphrase.
- If cutoff passed: return `status: "closed"`; landing/confirm pages show a closed message.

**signup-confirm**
- On first successful confirm:
  1. Generate a passphrase using the existing `generatePassphrase` shape (moved to a shared util).
  2. Compute deterministic email/password (existing `passphraseToEmail` / `passphraseToPassword`).
  3. Provision the auth user via service role `auth.admin.createUser` (email-confirmed).
  4. Insert `verified_participants(user_id, signup_id)`.
  5. Store `passphrase`, `auth_user_id`, `passphrase_issued_at` on the signup row.
  6. Enqueue the passphrase email (new template `signup-passphrase`).
- On already-confirmed calls: no rotation — just re-enqueue the passphrase email (idempotency key includes `passphrase_issued_at`).

**New app-email template** `signup-passphrase.tsx`
- German copy, brand styling (same tokens as existing signup-confirm template).
- Shows the passphrase in a monospaced block, explains it's the only key, links back to `/7mm9`.

**Cutoff enforcement**
- Both edge functions read `app_settings.registration_cutoff_at`. After cutoff: signup-request refuses new emails and resends; signup-confirm still confirms already-issued tokens (grace) but returns `status: "closed_no_new_passphrase"` for brand-new confirms.

## Frontend

**Landing (`/`)**
- Success message references "wir schicken dir deinen Zugangs­satz per E-Mail nach Bestätigung".
- If server responds `closed`, show a closed state.

**Confirm (`/confirm`)**
- Success copy: "Wir haben dir deine Passphrase gerade per E-Mail geschickt." (No passphrase shown in the browser — email-only delivery, as chosen.)
- New states: `closed`, `resent`.

**Event UI (`/7mm9`)**
- Silent anonymous auth stays for read-only browsing.
- Writing actions (submit opinion, open chat / send chat request, rate opinion, rate chat) call a new helper `requireVerifiedParticipant()`:
  - If the current auth user is in `verified_participants` → proceed.
  - Otherwise → open a dialog offering (a) enter existing passphrase, or (b) register email. The passphrase form signs into the deterministic auth user for that passphrase; the email form links to the Landing flow.
- Server-side RPCs (`submit_opinion`, `get_or_create_chat`, `submit_opinion_rating`, chat message insert policy, etc.) add `AND public.is_verified_participant(auth.uid())` so a bypassed UI still cannot write.
- Admin bot (existing hardcoded UUID) is excluded from the check.

**Admin (`/admin2`)**
- Add a field to edit `registration_cutoff_at`.
- Signups table already has "Resend" — repurpose it to trigger the passphrase email when a signup has one, otherwise the confirm link.

## Abuse-prevention properties

- Unique `lower(email)` index on `signups` (already exists) → one signup row per email.
- Passphrase issued on first confirm and never rotated → **one passphrase per email**.
- Auth user provisioning is deterministic from the passphrase → **one auth identity per passphrase**.
- Writes require `verified_participants` → silent anonymous multi-accounts cannot participate.
- Number of participants is not limited; only per-email uniqueness is enforced.
- Late joiners allowed until `registration_cutoff_at`.

## Technical notes

- New signup columns and `verified_participants` require a migration with GRANTs and RLS.
- `auth.admin.createUser` in `signup-confirm` uses `email_confirm: true` on the pseudo `@freemind.local` address so the resulting session works without another confirmation round-trip.
- Passphrase generation moves to `supabase/functions/_shared/passphrase.ts` so client and edge share identical rules.
- Email throttling for resends uses the existing `email_send_log` (query recent sends with the same idempotency template) — no new table needed.
- Deterministic-email collisions: on the (astronomically rare) collision we fall back to appending a numeric suffix and retry up to 3 times before returning `status: "error"`.
- Existing security memory around `bot_chat_access_bypass` / hardcoded UUIDs is respected — the bot exemption stays inside `is_verified_participant` and is not reintroduced in RLS predicates.

## Out of scope

- IP-based rate limiting on signup-request (can add later if abuse spikes).
- Rotating a lost passphrase (explicitly declined — same passphrase is always resent).
- Any change to `/` (Landing) styling beyond the closed/resent copy.
