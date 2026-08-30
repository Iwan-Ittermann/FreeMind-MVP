# Playground polish + unfreeze the August graph

## 1. Save the August result, then open the graph fully

- Create a snapshot table `archive_results` holding, per opinion: rank, points, opinion text, author id, captured-at timestamp.
- Fill it once with the current final standing of the August topic (time-weighted bridge points, same math the app uses), so "who won" is preserved forever even as the graph keeps changing.
- Then remove the freeze: the reopen cutoff rules (`is_post_reopen_opinion` / `is_post_reopen_chat`) come out of the write policies and out of the opinion/chat creation functions. From then on /aug-test behaves like a normal live discussion — old August opinions can be rated and chatted with, and points keep accumulating.

## 2. Remove the bots from /aug-test

- Stop invoking the bot function for the archive target.
- Delete the existing bot opinions in the August topic together with their chats, messages and ratings (cascade cleanup), so the graph is clean.
- The sandbox (/go) keeps its bots A / B / C unchanged.

## 3. Respect scale in the sandbox

Today the "how well did they understand you?" scale is hidden in bot chats, so sandbox visitors never see it. Show it in bot chats too (sandbox / open playground), with the same unlock rule as human chats, so the full rating loop can be tried out.

## 4. Show the disagreement rating you already gave

In the opinion panel of both discussions: when you have already rated an opinion, display the saved value with a small pencil button that reopens the scale for editing (replaces the current text-only "change rating" link).

## 5. Small UI items

- The "freemind" wordmark in the header of /go and /aug-test becomes a link to `/`.
- The playground/archive disclaimer notice only appears once per device — dismissing it (or seeing it once) is remembered in local storage, per mode.
- New "Delete my opinion" action in the header settings menu of /go and /aug-test: asks for confirmation, then removes your opinion plus its chats, messages and ratings, and returns you to the "post an opinion" state.

## Technical notes

- Migration 1: `create table public.archive_results` (+ GRANTs: read for anon/authenticated, all for service_role; RLS with public read, no client writes) and a one-shot insert computed from `rating_events` / `opinion_ratings` via the existing time-weighted logic.
- Migration 2: drop the post-reopen conditions from the opinions / chats / chat_messages / chat_ratings / opinion_ratings / chat_requests policies and from `submit_opinion` + `get_or_create_chat`; keep `is_open_topic` gating so verification stays bypassed there.
- Migration 3: `delete_my_opinion(_topic_id uuid)` — security definer, only for the caller's own opinion and only on open topics (`is_open_topic`), cascading like `delete_opinion_cascade`, with an audit log entry.
- Bot cleanup runs as data SQL against the archive topic using the fixed bot user ids.
- Frontend: `Discussion.tsx` (no archive bots, delete handler wiring), `TTHeader.tsx` (logo link, delete action), `TTModeNotice.tsx` (localStorage dismissal), `TTBottomPanel.tsx` (saved rating + pencil), `EmbeddedChatView.tsx` / `FloatingChatWindow.tsx` (respect scale in bot chats). New EN/DE strings for all added copy.
