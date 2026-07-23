## Plan: Provision 6 test passphrases

To bypass verification during testing, I'll mint 6 fresh passphrases end-to-end (auth user + `verified_participants` row) so each can sign in via the "Ich habe schon eine Passphrase" dialog and post opinions.

### Approach
Auth users can only be created with the service role key, so I'll add a **short-lived admin-gated edge function** `provision-test-passphrases` that:
1. Verifies the caller with the `ADMIN_PASSWORD` secret (same pattern as `verify-admin-password`).
2. Generates 6 random passphrases using `generatePassphrase()` (same helper as `signup-confirm`).
3. For each: creates an auth user via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`, then inserts a `verified_participants` row.
4. Returns the 6 passphrases in the response.

Then I:
- Deploy the function.
- Invoke it once with the admin password.
- Print the 6 passphrases to chat.
- Delete the function (leave no permanent backdoor).

### Files
- `supabase/functions/provision-test-passphrases/index.ts` — new, temporary
- `supabase/functions/_shared/passphrase.ts` — already exists, reused
- No schema changes; no client changes; CTA fix deferred as requested.

### Verification
- Confirm 6 rows appear in `verified_participants` and 6 users appear tied to those signups.
- Confirm each passphrase logs in via the "Ich habe schon eine Passphrase" dialog on `/7mm9`.
- Then delete the edge function.