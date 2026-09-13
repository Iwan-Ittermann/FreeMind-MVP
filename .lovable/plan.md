# Wedium partner test access on /wedium/go

Replace the "Ich habe schon eine Passphrase" link on the /wedium/go waiting screen with an "Öffnen" option. It asks for a password and then lets Wedium partners pick one of four ready-made test accounts, each with a pre-written opinion, so they can try the discussion end to end.

## What the partner sees

1. On /wedium/go (countdown screen) there is a small "Öffnen" link instead of the passphrase link.
2. Clicking it opens a small panel with a single password field.
3. Wrong password: short error, nothing else happens. Right password: the panel switches to a list of four test people, each with their name and their opinion text.
4. Picking one signs them in as that test person and drops them straight into the discussion: graph, opinion list, chats — everything works, they can chat with the other three test accounts.
5. The panel can be closed at any time; a "back" step lets them switch to another test account (sign out, pick again).

The password is stored as a project secret (`WEDIUM_DEMO_PASSWORD`) — I will ask you to enter it in a secure form when we build this. It is never in the code.

## Test accounts

Four accounts on the Wedium topic, with four clearly different positions on social-media laws (German, since /wedium/go is the German event). Draft texts, easy to change later:

- Mara — strict platform liability: Plattformen sollen für Inhalte haften wie Verlage.
- Jonas — transparency first: keine Verbote, aber offene Algorithmen und Datenzugang für Forschung.
- Selin — protection of minors: Altersgrenzen und Werbeverbot für unter 16.
- Timo — free speech: möglichst keine neuen Gesetze, Löschungen nur per Gerichtsbeschluss.

These accounts are marked as demo accounts so they can be recognised and removed after the partner phase, and they do not count in the event statistics or the daily brief.

## Technical notes

- New edge function `wedium-demo-access` (service role, CORS like `verify-admin-password`):
  - `POST { password }` → verifies against the `WEDIUM_DEMO_PASSWORD` secret; on success returns the four demo accounts (label + opinion preview). Never returns anything on failure beyond 401.
  - `POST { password, accountKey }` → idempotently creates/ensures the auth user (deterministic passphrase per account, `passphraseToEmail`/`passphraseToPassword` from `_shared/passphrase.ts`), ensures its `opinions` row for the Wedium topic (`visible: true`), and returns that account's passphrase.
- Client: new `TTDemoAccessPanel` component. On account pick it calls the function, then `loginWithPassphrase(passphrase)` (which signs any silent session out first), invalidates `['myOpinionForTopic']` + topic data, and closes the panel.
- `TTGateOverlay.tsx` countdown variant: the `tt.alreadyHavePassphrase` button is replaced by an "Öffnen" button that opens the panel. Only rendered for the Wedium topic so /go and /aug-test are untouched.
- Demo accounts get a `is_demo` marker (settings row or a dedicated `demo_accounts` table keyed by user_id) used to exclude them from event stats/mails and to allow later cleanup.
- New i18n keys in `de.json`/`en.json` for the button, panel title, password field, error and account labels.
