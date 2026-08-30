# Relaunch: English site, August archive, open sandbox discussion

The August event is over. The site becomes English-first, the old discussion moves to a public read-only archive, and `/go` becomes an always-open sandbox anyone can try without registration — with three bots to play the rating mechanics against.

## 1. Language: English by default, switch kept

- Default language becomes English; German stays available through the existing flag/language switcher in the header.
- Scope: landing page, sandbox, archive, chat/graph UI, FAQ, report, passphrase recovery, confirm/unsubscribe pages.
- Admin panels and email templates stay German for now.
- All hard-coded German strings on those public pages move into translation keys so the switcher actually works everywhere.

## 2. Old discussion → `/aug-test` (public read-only archive)

- The August topic ("Welche Partei wählst du – und warum?") is reachable at `/aug-test`.
- Open to everyone, no login: graph, opinion list, ratings and all chats are readable.
- No writing: opinion form, rating scales, chat composer and chat-request buttons are hidden.
- A banner marks it as an archive of the 23–29 August event and links back to the sandbox.
- The winner/prize panel stays visible for logged-in participants of that event, so the top 5 can still fetch their code.
- `/go` no longer points to this topic; old links to `/7mm9` redirect to the archive.

## 3. New `/go`: open sandbox

- New topic: **"Why is social media so toxic but everyone uses it?"**
- Open to all — no email registration, no waiting phases, no verification.
- First contribution silently creates an anonymous account in the background; the generated passphrase is shown once (copy/download) so a visitor can return on another device. The existing "already have a passphrase?" login stays.
- A permanent disclaimer explains this is a sandbox to try out freemind: data may be reset, no prizes, everything public.
- No polarization survey, no daily-brief nudges, no countdown or prize panel on this route.

### Three bots

- Bots **A**, **B** and **C** each hold their own opinion in the sandbox graph and are visibly labelled as bots.
- Whenever a visitor posts an opinion (checked on page load too), each bot:
  - rates that opinion with a strong disagreement, so the new node lands in a spread-out position, and
  - opens a chat and sends three short messages introducing itself as Bot A / B / C and inviting the visitor to try the respect rating.
- Idempotent: a bot reacts to each opinion exactly once.

## 4. Landing page `/` rewritten in English, no live data

- Removes all references to the running discussion, live stats and the countdown.
- Keeps the existing sections and layout; only the copy is translated and de-dated, plus two clear links: **Try the sandbox** (`/go`) and **See the August discussion** (`/aug-test`).
- The "Jetzt registrieren" section becomes **"Register for future events"**: same email form, copy explains that a future event runs for 4 days and registrants get notified.
- Footer keeps Impressum / FAQ / contact.

## Technical notes

- New `app_settings` keys `sandbox_topic_short_code` and `archive_topic_short_code`; `useEventTopic` gains `sandbox` and `archive` roles alongside `test`. `Discussion.tsx` takes `mode="sandbox" | "archive" | "test"` and derives gating, read-only state and which overlays render from it.
- Migration: insert the sandbox topic with a fresh 4-char short code, three bot opinions, and the settings keys. Archive topic is flagged closed.
- `src/lib/constants.ts` grows from one `BOT_USER_ID` to three fixed bot UUIDs plus an `isBotUser()` helper; call sites in `tt-layout`, `freemind-layout`, `tokenizer`, `GraphNodes`, chat hooks and chat views switch to it.
- New edge function `sandbox-bots` (service role, idempotent) creates bot ratings, chats and messages; invoked from the sandbox page after load and after an opinion is submitted.
- Read-only archive is enforced in the UI and by marking the topic inactive; existing RLS is unchanged.
- `i18n/config.ts`: `lng: 'en'`, `fallbackLng: 'en'`, `supportedLngs: ['en', 'de']`, persisted per device.
- Routes: `/aug-test` added, `/7mm9` and `/secret` redirect to `/aug-test`.
