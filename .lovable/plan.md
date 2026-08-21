# Topic-scoped notifications, inline unread badges, no chat names

## 1. Notification panel: only the current topic

The bell panel currently lists every stored notification of the user, regardless of topic, so someone in `/go` also sees `/test` events.

- Filter the notification list by the currently active topic (keep rows whose topic matches; drop rows from other topics).
- Apply the same scoping to the unread dot/count in the header and to the app-icon badge, so the badge matches what the panel shows.
- The standalone notifications page (`/benachrichtigungen`) is opened from a topic view, so it gets the same topic scope; notifications without a topic (general/system) stay visible everywhere.

## 2. Inline unread badges in the chat list

The chat list already renders a red badge per row, but the chat data is built without the unread counts, so it is always 0.

- Feed the per-conversation unread counts into the chat list data so each row shows its own badge, and unread chats keep sorting to the top.
- The badge stays a small inline red pill with the number (99+ cap) next to each chat entry.

## 3. Drop AI chat names

- Chat rows and the chat header show the counterpart's opinion text as the title instead of a generated name.
- Stop generating new titles (no more calls to the title generator when a chat is opened).
- "Alle Chats" rows likewise use the opinion texts.
- Existing stored titles are simply no longer displayed; nothing is deleted.
- Chat search keeps working on opinion text and last message.

## 4. Nudge emails — status

No nudge emails have gone out yet. The send log contains only `campaign-prepare` (2), `campaign-soft-launch` (28) and `campaign-sogehts` (31); there are zero `nudge-rate` and `nudge-chat` sends. The in-app nudge hint is live, the mail side has not fired yet. On request I can trigger the "Diskutieren" nudge manually from /admin2 in the same turn.

## Technical notes

- `useStoredNotifications`: accept an optional `topicId` and filter both the initial query and the realtime insert handler; unread count and `setAppBadge` derive from the filtered list.
- `Discussion.tsx`: pass `activeTopicId` into `useStoredNotifications`, and pass `unreadMap` as the second argument of `useTTChats(activeTopicId, unreadMap)` (ordering already handles `unreadCount`).
- `Notifications.tsx`: read the active topic (event topic hook) and pass it through.
- `TTSideTabs.tsx`: replace `chatTitleFor(c)`/`c.title` usage with the opinion text for both "Meine Chats" and "Alle Chats"; drop the second opinion-text line where it becomes a duplicate.
- Remove the `useEnsureChatTitles` call site (keep the file and the edge function unused) and the title line in `EmbeddedChatView`/`FloatingChatWindow` headers.
