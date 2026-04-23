

## Plan: Three Fixes — Global Notification Filters, Browser Permission, Chat Badge

### 1. Make Notification Filters Global (not per-topic)

Currently filters are stored per-topic in localStorage. This will be simplified to a single global preference object.

**`src/lib/tt-notification-prefs.ts`** (edit)
- Add global filter functions: `getGlobalFilters()`, `setGlobalFilters()` using a new localStorage key `tt:notification-filters`.
- Keep per-topic `enabled` boolean (the left bell still toggles subscription per topic).
- `isFilterEnabled()` reads from the global filters instead of per-topic filters.

**`src/components/tt/TTHeader.tsx`** (edit)
- Add a filter icon (e.g. `SlidersHorizontal`) button inside the notification dropdown header.
- Clicking it toggles an inline filter checklist (same 5 items) within the dropdown panel.
- Filter changes save to `getGlobalFilters()`/`setGlobalFilters()`.

**`src/components/tt/TTNotificationSetup.tsx`** (edit)
- Remove the filter checklist from the setup bottom sheet. It becomes a simple "Enable browser notifications" prompt with the CTA button and a "Not now" dismiss.

**`src/components/tt/TTNotificationsBell.tsx`** (no change needed)
- Left bell continues to toggle per-topic subscription on/off.

**`src/i18n/locales/en.json` + `de.json`** (edit)
- Add translation keys for the filter section header in the dropdown (e.g. `tt.notifFilterTitle`).

### 2. Fix Browser Permission Button Not Triggering

The `Notification.requestPermission()` call in the bottom sheet likely fails silently inside the Lovable preview iframe (cross-origin iframes block the Notification API).

**`src/components/tt/TTNotificationSetup.tsx`** (edit)
- Wrap the `requestPermission` call in a try/catch and detect iframe context (`window.self !== window.top`).
- If inside an iframe or if `Notification` is undefined, show an informative message: "Browser notifications are not available in preview mode. Please open the app directly."
- Add a visible status indicator showing the current permission state (`granted` / `denied` / `default` / `unavailable`).

### 3. Fix Chat Sidebar Badge Showing Total Chats Instead of Unread Count

**`src/components/tt/TTSideTabs.tsx`** (edit)
- Accept `unreadCount` (number) as a new prop instead of deriving the badge from `chats.length`.
- Show the badge only when `unreadCount > 0`, displaying the actual unread count.

**`src/pages/TT.tsx`** (edit)
- Use `useUnreadMessages(activeTopicId, ownOpinionId)` to get the unread map.
- Compute total unread count from the map and pass it as `unreadCount` to `TTSideTabs`.

This ensures the badge disappears once `EmbeddedChatView` marks messages as read (which triggers `useUnreadMessages` to refetch via the realtime subscription it already has).

---

### Summary of File Changes

| File | Change |
|------|--------|
| `src/lib/tt-notification-prefs.ts` | Add global filter storage functions |
| `src/components/tt/TTHeader.tsx` | Add filter icon + inline filter UI in notification dropdown |
| `src/components/tt/TTNotificationSetup.tsx` | Remove filters, simplify to permission-only prompt, add iframe detection |
| `src/components/tt/TTSideTabs.tsx` | Replace `chats.length` badge with `unreadCount` prop |
| `src/pages/TT.tsx` | Pass unread count from `useUnreadMessages` to `TTSideTabs` |
| `src/hooks/useTTNotifications.ts` | Read from global filters instead of per-topic filters |
| `src/i18n/locales/en.json` | Add filter section translations |
| `src/i18n/locales/de.json` | Add filter section translations |

### Not Changed
- The left-side bell still toggles per-topic subscription (whether notifications are on for that topic at all).
- No database changes required.

