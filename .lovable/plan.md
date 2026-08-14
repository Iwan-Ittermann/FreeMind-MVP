# Fix blinking notice/countdown, restore passphrase link, footer alignment

## 1. Blinking notice and countdown (root cause found)

Verified in the running app: for visitors without a login, every 4-second data poll of the
opinions view fails with HTTP 401 and the message `permission denied for function has_role`.
Reason: the read policies on `opinions`, `chat_messages`, `opinion_ratings` and `topics`
call the `has_role` helper, but visitors (role `anon`) no longer have permission to execute
that function — it was removed from `anon` during earlier security hardening. The failing
poll makes the app's loading state flip on and off, and the notice for unregistered users
plus the countdown box are mounted/unmounted with each flip. That is the rhythmic blinking
on both `/test` and `/go`.

Fix, two layers:

- Database migration: give `anon` permission to execute the role-check helpers
  (`has_role`, `is_chat_participant`). They are security-definer read-only checks and simply
  return false for visitors — no data is exposed by this, and it restores public read access
  the app expects.
- Make the UI immune to transient fetch failures: once the app knows whether the visitor has
  an opinion, that answer stays put ("latched") instead of falling back to a loading state.
  This keeps the notice and countdown stable even if a request fails.

Verification: reload `/test` and `/go` in the browser, watch for 20+ seconds, confirm no 401
responses and the notice/countdown stays on screen without flicker.

## 2. "Already have a passphrase?" link

The login entry point currently exists only inside the settings (gear) panel, so the notice
for unregistered users lost it. Restore it:

- Add an "Already have a passphrase?" link to the unregistered notice on `/test` and `/go`
  and to the countdown box.
- Clicking it opens the settings panel with the login form already expanded (via a small
  window event the header listens for), so there is only one login form in the app.
- Reuse the existing translation keys (EN/DE) — no new copy.

## 3. Footer

Move the Impressum link in the bottom bar from centered to the left corner (keep size,
colour and height unchanged).

## Technical notes

- Migration: `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;` and the
  same for `public.is_chat_participant(...)`. No policy changes.
- `src/pages/Discussion.tsx`: latch `ownOpinionKnown` in a ref/state so it never returns to
  the unknown state; add the passphrase link to the unregistered pill; left-align the
  footer link.
- `src/components/tt/TTGateOverlay.tsx`: add the same passphrase link under the countdown.
- `src/components/tt/TTHeader.tsx`: listen for `tt:open-login` to open the account panel with
  `showLogin` true.
