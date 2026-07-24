# Single-Topic Cleanup Plan

Now that data has been migrated to the other project, we lock this project to one topic (`7mm9`) and delete everything that only existed to support multiple topics. Then we wipe data.

## Phase 1 — Routing & topic resolution

- `src/App.tsx`: drop the `/:topicId` redirect route; keep only `/`, `/7mm9`, `/confirm`, `/unsubscribe`, `/legal`, `/admin`, `/admin2`, and `*` → `/7mm9` (or `/`).
- `src/hooks/useTTTopics.ts`: delete `useTTSwipeWindow` entirely; keep a minimal `useTTTopic()` that returns the single `7mm9` topic (or replace with a direct query in the one place that still needs the topic id).
- `src/pages/EineWocheEineFrage.tsx`: remove the swipe-window / loop-clone system — no `renderedTopics`, no `clone-start-*` / `clone-end-*`, no `IntersectionObserver` topic-switch detection, no `navigate('/${code}')` on scroll, no `activeTopicId` state. Render exactly one `TTScreenInner` for the single topic. Drop `isLoopClone` prop from `TTScreen.tsx` and all its usages.

## Phase 2 — Notifications & subscription prefs

- `src/lib/tt-notification-prefs.ts`: collapse the `Record<topicId, prefs>` into a single flat prefs object; remove `getSubscribedTopicIds()` and the `newTopic` filter (a new topic can never appear).
- `src/hooks/useTTNotifications.ts`: remove the realtime listener on `topics` INSERT and all "new topic available" notification code paths.
- `src/components/tt/TTHeader.tsx`: remove `useTTTopics` import, `topicTitleMap`, and per-topic grouping in `groupedNotifications` — render a flat list. Update any UI that surfaces the `newTopic` filter toggle.

## Phase 3 — Delete dead multi-topic hooks & admin "create topic"

Delete from `src/hooks/useTopics.ts` (all confirmed unused):

- `useUserTopics`, `useHasJoinedTopic`, `useJoinTopic`, `useTopicBySlug`, `useTopicMemberCount`, `useCreateTopic`.

Keep: `useAllTopics` (admin list, will show 1 row), `useUpdateTopicStatus`, `useUpdateTopicTitle`, `useUpdateTopicDescription`.

Delete `src/components/admin/CreateTopicDialog.tsx` and remove its "New topic" button/trigger from `src/components/admin/TopicPanel.tsx` (verify TopicPanel body first and drop only that trigger — keep the topic list + edit/status controls).

## Phase 4 — Database cleanup (single migration)

Drop now-unused RPCs and tables (verify no edge function references before dropping):

- Drop functions: `join_topic`, `has_joined_topic`, `get_user_topics`, `create_topic`.
- Drop table `user_topics` (backed only the removed RPCs).
- Keep `update_topic_status` — admin still uses it.
- Keep the `short_code` column but no longer treat it as a lookup key in app code.

Grep `supabase/functions/**` for any references to the dropped RPCs before running the migration; if any exist, adjust or preserve.

## Phase 5 — Data wipe

Run a single migration that:

- Deletes all rows from: `chat_messages`, `chat_message_reactions`, `chat_ratings`, `chat_requests`, `chats`, `opinion_ratings`, `opinion_ips`, `opinions`, `fake_nodes`, `audit_logs`, `reports`, `court_cases`, `chat_ratings`, `user_blocks`, `signups` (except the 6 verified test entries), `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `banned_emails` (optional).
- Preserves in `verified_participants`: the 6 test passphrases you want to keep — I will list them for confirmation before running.
- Preserves in `topics`: only the `7mm9` row's `title` and its identity; clears `description` only if you say so.
- Leaves `email_templates`, `app_settings`, `tutorial_settings`, `laws`, `user_roles` untouched.

## Technical notes

- I'll verify `src/components/admin/TopicPanel.tsx` content in Phase 3 before deleting `CreateTopicDialog` to make sure nothing else wires into it.
- `useTopicMemberCount` and `user_topics`: grep confirmed zero call sites in `src/`; migration will fail cleanly if any DB dependency remains, at which point we adjust.
- All deletions are additive-safe (no runtime code path currently depends on them).

## Open questions before I execute

1. In Phase 5, do you want the two submitted opinions gone (as stated) but also want the topic's `title`/`description`/`short_code` preserved exactly as-is? Confirm "keep 7mm9 metadata, drop opinions + everything downstream". YES
2. Should I also keep or wipe the `banned_emails` list? KEEP
3. Any signups outside the 6 test passphrases you want preserved (e.g. your own admin email)? NO