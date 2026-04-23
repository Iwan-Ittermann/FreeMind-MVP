## Plan: TT Browser Notifications with Filter Preferences

### Current State

- The **left-side bell** (`TTNotificationsBell`) toggles an in-app subscription per topic stored in `localStorage`. It controls whether items appear in the header bell's notification panel.
- The **header bell** (`TTHeader`) displays a dropdown of `TTNotification` items but currently receives an empty array — the panel is wired but not populated with live data.
- `useBrowserNotification` exists for the original `/topic/` route but is not used in `/tt`.
- There is no notification filter system — users receive all or nothing.

### Design

When the user taps the left-side bell for the first time:

1. A brief **explanation modal** appears: "Stay in the loop — get notified about new opinions, messages, and more. You can customize what you receive." (all newvtexts integrated as i18n key for [DE] and [EN])
2. A **notification filter icon opens a checklist** with five categories, all checked by default:
  - New opinions added
  - New message in existing chat
  - First message in new chat
  - New topic added
  - New highlight in subscribed topic
3. A "Turn on notifications" button triggers the browser `Notification.requestPermission()` prompt.
4. On approval, preferences are saved to `localStorage` and the subscription is active.
5. Subsequent taps on the bell toggle on/off; a long-press or a settings gear next to the bell reopens the filter picker.

Browser notifications fire **only** for the categories the user has enabled. The header notification panel shows the **same** filtered set — both views share one source of truth.

### 1. Notification Preferences Storage

**File: `src/lib/tt-notification-prefs.ts**` (new)

```text
Storage key: tt:notification-prefs
Shape: Record<topicId, {
  enabled: boolean,
  filters: {
    newOpinion: boolean,
    newMessage: boolean,
    newChat: boolean,
    newTopic: boolean,
    newHighlight: boolean,
  }
}>
```

Helper functions: `getPrefs(topicId)`, `setPrefs(topicId, prefs)`, `isFilterEnabled(topicId, filterKey)`.

### 2. Permission + Filter Modal

**File: `src/components/tt/TTNotificationSetup.tsx**` (new)

A bottom-sheet style modal triggered on first bell tap:

- Explanation text: "Get notified when something happens in this topic. Choose what matters to you."
- Five toggle rows with labels and icons.
- Primary CTA: "Enable Notifications" (calls `Notification.requestPermission()`).
- Secondary: "Not now" to dismiss without enabling.
- If permission was previously denied, show a note explaining how to unblock in browser settings.

### 3. Refactor `TTNotificationsBell`

**File: `src/components/tt/TTNotificationsBell.tsx**` (edit)

- On first tap (no prefs saved): open `TTNotificationSetup` modal.
- On subsequent taps: toggle enabled on/off.
- Add a small gear/settings icon that re-opens the filter picker.
- Read/write prefs via the new helpers in `tt-notification-prefs.ts`.
- Remove the old `STORAGE_KEY` approach.

### 4. Live Notification Feed Hook

**File: `src/hooks/useTTNotifications.ts**` (new)

Central hook that:

- Subscribes to realtime `postgres_changes` on `opinions` (INSERT), `chat_messages` (INSERT), `chat_requests` (INSERT with status=accepted), and `topics` (INSERT) for subscribed topic IDs.
- Maintains an in-memory array of `TTNotification` items.
- For each incoming event, checks the user's filter prefs via `isFilterEnabled()`.
- If the filter passes:
  - Adds the item to the notification list (for the header panel).
  - Fires a browser `Notification` if the tab is not focused and permission is granted.
- Deduplicates by event ID to avoid double-firing.
- Returns `{ notifications, unreadCount, markAllRead }`.

### 5. Wire Into TT Page

**File: `src/pages/TT.tsx**` (edit)

- Import `useTTNotifications` and pass its `notifications` to `<TTHeader>`.
- The header bell badge now reflects real unread count.

### 6. File Summary


| File                                        | Change                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `src/lib/tt-notification-prefs.ts`          | New — localStorage helpers for per-topic filter prefs                |
| `src/components/tt/TTNotificationSetup.tsx` | New — permission request modal with filter checkboxes                |
| `src/components/tt/TTNotificationsBell.tsx` | Refactor — integrate prefs, open setup on first tap                  |
| `src/hooks/useTTNotifications.ts`           | New — realtime listener, filter check, browser notification dispatch |
| `src/pages/TT.tsx`                          | Wire `useTTNotifications` → `TTHeader`                               |
| `src/components/tt/TTHeader.tsx`            | Minor — accept `unreadCount` + `onMarkRead` props                    |


### 7. Notification Categories Detail


| Filter key     | Realtime source                                                                         | Browser notification title |
| -------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `newOpinion`   | `opinions` INSERT where `topic_id` matches                                              | "New opinion added"        |
| `newMessage`   | `chat_messages` INSERT where chat belongs to subscribed topic, and chat already existed | "New message"              |
| `newChat`      | `chat_messages` INSERT where it's the first message in a chat (check via count)         | "New conversation started" |
| `newTopic`     | `topics` INSERT                                                                         | "New topic available"      |
| `newHighlight` | Deferred — needs a highlights table. Will show as disabled/coming soon for now.         | &nbsp;                     |


### 8. Out of Scope

- Push notifications via service workers (this uses the simpler Web Notifications API which works when the tab is open).
- Chat request notifications (explicitly excluded per user request).
- Database-persisted notification preferences (localStorage is sufficient for this prototype).
- Sound alerts.