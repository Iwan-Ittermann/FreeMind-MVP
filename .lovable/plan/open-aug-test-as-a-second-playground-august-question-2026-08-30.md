# Open /aug-test as a second playground (August question)

/aug-test currently shows the finished August discussion completely read-only. It becomes open to everyone — no email registration, silent login, a skippable opinion prompt and three bots — while everything that happened in August stays frozen exactly as it is.

## What visitors will experience

- Visiting /aug-test works without any registration. An account is created silently the moment someone actually posts (same as /go), and the passphrase is shown once so they can come back.
- An opinion prompt appears first and can be closed with a small cross; the normal button re-opens it.
- Bot A / B / C live in this topic too, with copy written for the August question. They rate every new opinion as strongly different and open a chat with three intro messages, so a newcomer always has someone to talk to.
- The notice at the bottom keeps the archive framing: this was the August event, now open to try out.
- Everything from August (opinions, chats, ratings, scores, the winners) stays visible and untouchable. Newcomers can rate and chat with the bots and with each other, not with the August participants. Old chats cannot be continued.
- The August participants are not disturbed: no new bot chats, no new ratings on their opinions, no notifications or e-mails from this activity, and their scores do not move.

## Things worth flagging (answers to "did I forget something?")

- **Freeze line**: we record the reopening moment. Anything created before it is history; everything after it is playground. This is what keeps the old ranking honest.
- **Notifications / e-mails**: the digest, daily brief and nudge mails currently target the event topics. They must ignore playground activity in the archive so August registrants get nothing.
- **Two playgrounds**: /go and /aug-test will behave identically except for the question and the notice text. The landing page should link both as "try it" options rather than presenting /aug-test as a read-only archive.
- **Winners / prize codes**: untouched. The end panel stays off in this mode.
- **Bot identity**: the same three bot accounts are reused; one opinion per topic per account, so this is safe.

## Technical outline

Database (one migration):

- New settings: `archive_open` (true) and `archive_reopened_at` (timestamp of the migration).
- New helpers: `is_open_topic(_topic_id)` = sandbox topic OR (archive topic AND `archive_open`), and `is_post_reopen_opinion(_opinion_id)` / `is_post_reopen_chat(_chat_id)` = created after `archive_reopened_at`, or owned by a bot account.
- Rewrite the five write policies that currently read `NOT is_archived_topic(...) AND (is_verified_participant(...) OR is_sandbox_topic(...))` on `opinions`, `opinion_ratings`, `chat_requests`, `chat_messages`, `chat_ratings` to allow `is_open_topic(...)`, and — for the archive topic only — require the targeted opinion/chat to be post-reopen.
- `submit_opinion`: allow archive when `archive_open`, keep the verified-participant requirement for the real event.
- `get_or_create_chat`: allow new chats in an open archive only when both opinions are post-reopen (or a bot); still reject otherwise.

Edge function `sandbox-bots`:

- Accept a `target` parameter (`sandbox` | `archive`), resolve the topic from the matching setting, and carry a separate bot copy set for the August question.
- In the archive it only processes opinions created after `archive_reopened_at`, so August opinions are never rated or messaged.

Frontend:

- `Discussion.tsx`: give `archive` mode the sandbox behaviour when the archive is open — silent auth, dismissible submit gate, `TTCenterCTA`, verification bypass, `useSandboxBots('archive')`, `TTSandboxPassphrase` — while `ReadOnlyProvider` becomes false and the mode notice keeps the archive wording.
- `useEventConfig`: expose `archiveOpen`; if the flag is ever turned off, the current read-only archive behaviour returns unchanged.
- Bottom-zone offsets follow the existing no-overlap slots (notice raised while the gate is open).
- i18n: English-first strings for the reopened-archive notice and bot labels, with German fallbacks.
- `Landing.tsx`: present both playgrounds instead of "See the August discussion".

Verification: post an opinion on /aug-test in the preview, confirm bot chats appear, confirm rating an August opinion and continuing an old chat are refused, and confirm /go is unaffected.
