## Plan

### 1. Re-provision 6 test passphrases

Insert 6 rows into `verified_participants` linked to fresh `auth.users` accounts with known passphrases (deterministic email/password derived via existing `passphraseToEmail`/`passphraseToPassword` helpers). Also insert matching rows into `signups` so they appear in `/admin2`. Passphrases will be listed back to you after creation.

Since `auth.users` inserts can't be done via SQL migration cleanly, we'll use a one-shot edge function `provision-test-passphrases` (same pattern used before), run it, then delete it.

### 2. Gate the "Add Opinion" CTA on verified status

In `src/pages/EineWocheEineFrage.tsx`:

- Query `verified_participants` for the current user (or reuse existing verification check).
- If user is NOT verified (or not signed in), replace `<TTCenterCTA>` with a small centered notice panel using `t('tt.registerToParticipate')`.
- If verified and no opinion yet, keep current `<TTCenterCTA>` behavior.

Add i18n keys (DE + EN):

- `tt.registerToParticipate`: "Registriere dich unter [freemind.chat](https://freemind.chat) um teilzunehmen" / "Register at [freemind.chat](https://freemind.chat) to participate"

The notice will render as a small pill/card in the same slot as the CTA, with a link to `https://freemind.chat`.

### 3. Simplify Settings panel (`ConfigPanel.tsx`)

Remove:

- "Your passphrase" label + display box
- Copy button
- Download button
- `handleCopy`, `handleDownload` handlers
- `emailToPassphrase` import, `passphrase` variable, `copied` state

Instead, show login auth dialogue as inline in the settings panel. (already wired through "du hast bereits eine passphrase?" Just needs to be moved up)

### Technical notes

- Verification check: reuse the `verified_participants` lookup pattern from `src/lib/verification.ts`; expose as a lightweight `useIsVerified()` hook to avoid duplicating logic in the page.
- The CTA-replacement notice must remain outside the graph interaction area, positioned where `TTCenterCTA` currently sits (bottom-center above footer).
- No DB schema changes needed.

### Files touched

- `supabase/functions/provision-test-passphrases/index.ts` (temp, deleted after run)
- `src/hooks/useIsVerified.ts` (new)
- `src/pages/EineWocheEineFrage.tsx`
- `src/components/ConfigPanel.tsx`
- `src/i18n/locales/de.json`, `src/i18n/locales/en.json`