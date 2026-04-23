

## Plan: Fix Unclickable Button in Notification Setup Bottom Sheet

### Problem
The notification setup bottom sheet content overflows the viewport on mobile screens. The CTA button ("Benachrichtigungen aktivieren") is pushed below the visible area because the sheet contains a header, description, 5 filter items, and 2 buttons with generous padding -- all without any scroll capability.

### Fix

**`src/components/tt/TTNotificationSetup.tsx`** (edit)

Add a max-height constraint and overflow scroll to the bottom sheet container so the content is always reachable:

1. Add `max-h-[85vh]` to the bottom sheet `motion.div` to cap its height at 85% of viewport.
2. Add `overflow-y-auto` to the inner `div` so the filter list and buttons scroll into view when content exceeds the available space.
3. Optionally reduce vertical padding slightly (`pb-6` instead of `pb-8`) to reclaim space on short screens.

### Scope
Single file change. No database or logic changes required.

| File | Change |
|------|--------|
| `src/components/tt/TTNotificationSetup.tsx` | Add `max-h-[85vh]` and `overflow-y-auto` to sheet container |

