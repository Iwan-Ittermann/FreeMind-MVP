

# Fix: Browser Notifications + Dialogue Points Label

## Bug 1: Browser notifications not firing

**Root causes** (two problems in `useBrowserNotification.ts`):

1. **`document.hidden` guard too strict** — Line 35 only fires notifications when the tab is in the background. During testing the tab is likely focused, so nothing fires. Firefox also has stricter handling here. Fix: remove or relax the `document.hidden` check (fire notification whenever count increases, the OS will handle deduplication).

2. **Chat requests not tracked at all** — The hook only watches `unreadCount` (messages). Chat requests are handled separately in `useChatRequests` and never trigger a browser notification. Fix: add a `chatRequestCount` parameter to the hook, track it with a second ref, and fire a notification when it increases.

### Changes in `src/hooks/useBrowserNotification.ts`:
- Add `chatRequestCount` parameter
- Remove `document.hidden` requirement (or make it optional)
- Add second `useEffect` that fires notification when `chatRequestCount` increases
- Add i18n key `notifications.newRequest` / `notifications.newRequestBody`

### Changes in `src/pages/Index.tsx`:
- Pass incoming chat request count to `useBrowserNotification`

---

## Bug 2: "dialoguePoints.label" showing as raw key

The i18n keys **do exist** correctly in both `en.json` and `de.json`. The config is standard. This is likely a stale build artifact. However, to harden against this:

- Verify the JSON files are syntactically valid (no trailing commas, correct nesting)
- Force a clean rebuild
- No code change needed since `t('dialoguePoints.label')` and the keys are correct

---

## Files to modify

| File | Change |
|------|--------|
| `src/hooks/useBrowserNotification.ts` | Add `chatRequestCount` param, remove `document.hidden` guard, add chat request notification effect |
| `src/pages/Index.tsx` | Pass incoming request count to the hook |
| `src/i18n/locales/en.json` | Add `notifications.newRequest`, `notifications.newRequestBody` |
| `src/i18n/locales/de.json` | Same keys in German |

