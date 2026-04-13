

# Browser Notifications for Topic Pages

## What changes

Add a bell icon button to the topic page header that lets users opt in to browser push notifications for new chat messages and chat requests. When enabled, the browser's Notification API fires desktop/mobile notifications even when the tab is in the background.

## How it works

1. **Bell icon in the header** — A bell icon appears in the topic page header (next to the sign-in button area). Clicking it requests `Notification.permission` and toggles notifications on/off for that topic. State is stored in `localStorage` (`notify-topic-{topicId}`).

2. **Notification triggers** — The existing real-time subscriptions in `useUnreadMessages` and `useChatRequests` already listen for new messages/requests. We extend `useBrowserNotification` to actually fire `new Notification(...)` when:
   - A new chat message arrives (not from the current user)
   - A new chat request is received (targeting the user's opinion)

3. **Visual feedback** — The bell icon shows filled/outlined state based on whether notifications are enabled. A tooltip explains the feature. If the browser denied permission, clicking shows a toast explaining how to re-enable in browser settings.

## Files

| File | Change |
|------|--------|
| `src/hooks/useBrowserNotification.ts` | Expand to handle `Notification.permission`, fire actual browser notifications, manage localStorage opt-in |
| `src/components/Header.tsx` | Add bell icon button, pass notification state as props |
| `src/pages/Index.tsx` | Wire up notification hook, pass props to Header |
| `src/i18n/locales/de.json` | Add `notifications.enable`, `notifications.disabled`, `notifications.newMessage`, `notifications.newRequest`, `notifications.denied` |
| `src/i18n/locales/en.json` | Same keys in English |

## Technical details

- Uses the standard Web Notifications API (`Notification.requestPermission()`, `new Notification(...)`)
- No service worker needed for basic notifications (tab must be open but can be in background)
- Permission state: `default` → prompt on click; `granted` → toggle on/off; `denied` → toast with instructions
- localStorage key per topic: `notify-topic-{topicId}` = `"true"` / absent
- Notification body includes a truncated preview of the message or the request sender info
- Clicking the notification focuses the tab via `notification.onclick = () => window.focus()`

