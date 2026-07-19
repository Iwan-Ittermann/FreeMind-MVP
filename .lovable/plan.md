## Goal

Replace Resend in the double-opt-in signup flow with Lovable's built-in transactional email. Drop the need for `RESEND_API_KEY`.

## Prerequisite (user action)

Lovable app emails require a verified sender domain you own (e.g. `notify.freemind.chat`). No domain is currently configured for this project. Before I can send, you'll set up the domain via the Email Setup dialog — I'll surface the button in the first build step. DNS verification can run in parallel with the code changes.

## Steps

1. **Set up email infrastructure.** Present the email domain setup dialog. Once configured, run `setup_email_infra` to create the pgmq queues, send log, suppression list, unsubscribe tokens, and the `process-email-queue` worker.

2. **Scaffold transactional email.** Run `scaffold_transactional_email` to create `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, and the template registry.

3. **Add two branded templates** in `supabase/functions/_shared/transactional-email-templates/`:
   - `signup-confirm.tsx` — the "Bestätige deine Anmeldung" email (ported from current Resend HTML, using React Email components + project brand colors from `src/index.css`).
   - `signup-admin-notify.tsx` — the admin notification currently sent to `ADMIN_NOTIFY_EMAIL` on confirmation.
   Register both in `registry.ts`.

4. **Rewrite `signup-request/index.ts`** to invoke `send-transactional-email` (template `signup-confirm`, `templateData: { confirmUrl }`, `idempotencyKey: signup-confirm-${token}`) instead of `fetch('https://api.resend.com/...')`. Remove `RESEND_API_KEY` and the inline HTML.

5. **Rewrite `signup-confirm/index.ts`** the same way for the admin notification (template `signup-admin-notify`, `recipientEmail: ADMIN_NOTIFY_EMAIL`).

6. **Create the unsubscribe page** at the path reported by `scaffold_transactional_email` (required so the auto-appended footer link resolves in-app).

7. **Deploy** the three edge functions (`signup-request`, `signup-confirm`, `send-transactional-email` + helpers auto-deploy). Verify by triggering a real signup once DNS is green.

8. **Cleanup.** Once verified, you can delete `RESEND_API_KEY` from secrets (I'll flag it, not auto-delete).

## Technical notes

- `SITE_URL` and `ADMIN_NOTIFY_EMAIL` secrets stay as-is.
- `FROM` address becomes whatever sender domain you verify (e.g. `noreply@notify.freemind.chat`); auto-configured by the transactional system.
- Unsubscribe footer is auto-appended by the system — templates must not include their own unsubscribe link.
- No DB schema changes.
