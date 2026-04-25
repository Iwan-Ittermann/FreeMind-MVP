## Plan: Fix TT bugs and improve mobile interaction UI

### Goals

- Browser notification permission should be requested (if not already allowed) every time right after a user successfully posts their opinion to a topic.
- The left-side bell should return to being a simple per-topic subscription toggle.
- `/tt` should clearly indicate vertical topic scrolling until the user has scrolled twice.
- `/tt` should load all active topics and loop endlessly instead of only using a previous/current/next window.
- Topic headlines should appear quickly while full graph data can continue loading.
- The selected-opinion disagreement rating should become a responsive 5-option scale.
- The chat respect-rating button should be a heart icon inside the message input, unlocked after two sent messages with a spark animation.

### Implementation

#### 1. Browser notification permission after posting an opinion

In `TTBottomPanel`, after `submit_opinion` succeeds:

- call a shared permission helper that checks `Notification.permission`
- if permission is `default`, request permission after the user-initiated posting flow
- if granted, auto-enable notification prefs for the current topic
- dispatch `tt:subscription-changed` so the bell and notification listener update

The existing bottom-sheet permission prompt can be bypassed/removed from this flow, because the browser permission request must happen from a direct user action.

#### 2. Make the left-side bell a subscription toggle again

In `TTNotificationsBell`:

- remove the setup modal behavior from the main bell tap
- make first tap subscribe/unsubscribe the current topic directly
- if browser permission is missing, request it from this bell tap
- keep subscription state in `tt-notification-prefs`
- keep the header notification dropdown for notification history + global filters

Result: the left bell becomes simple and predictable: on/off for this topic.

#### 3. Add a temporary scroll hint on `/tt`

In `TT.tsx`, add a lightweight overlay cue:

- small vertical swipe indicator near the upper/lower center, e.g. “Swipe for more topics” / “Wische für mehr Themen” with animated up/down chevrons
- store a local scroll count in `localStorage`
- hide the hint permanently after two topic-changing scrolls
- keep it non-blocking with `pointer-events-none`

#### 4. Load all topics and loop endlessly

Update `useTTTopics` / `useTTSwipeWindow`:

- remove `.limit(20)` so all active topics are fetched
- return lightweight topic objects `{ id, title }`
- replace the `[prev,current,next]` window with a cyclic rendered sequence

In `TT.tsx`:

- render all topic sections in the scroll container
- when the user scrolls past the last topic, jump seamlessly to the first equivalent section
- when the user scrolls before the first topic, jump seamlessly to the last equivalent section
- preserve route updates with `navigate('/tt/:id', { replace: true })`

Practical looping approach:

```text
[clone of last topic] [real topic 1] [real topic 2] ... [real last topic] [clone of first topic]
```

When a clone becomes active, instantly reposition to the matching real topic.

#### 5. Minimize headline loading latency

Use the already-light `topics` query as the source of header titles:

- derive `activeTopicTitle` from `useTTTopics()` immediately
- pass that title to `TTHeader`
- only fall back to `activeData?.title` if needed

This avoids waiting for `useTopicData(activeTopicId)`, which fetches opinions, ratings, fake nodes, graph pairs, and chat activity.

#### 6. Replace selected-opinion disagreement UI with a responsive 5-option scale

Replace/extend `TTEmojiRating`:

- labels: `Yes!`, `Yes`, `Neutral`, `No`, `No!`
- values: `0`, `25`, `50`, `75`, `100`
- colors from dark green to dark red
- render as a full-width segmented scale
- in `TTBottomPanel`, make the row layout:
  - scale fills available width from the left edge
  - “Let’s chat” button stays fixed-width on the right

This preserves existing DB semantics: `0 = agreement`, `100 = disagreement`.

#### 7. Move respect rating button into the chat input

Update `EmbeddedChatView` for the `/tt` side chat panel:

- replace the external “Rate!” button with a heart icon button positioned inside the message input field
- input expands to use the space gained by removing the external button
- use `Heart` as the icon
- when rating panel opens, keep existing save behavior for `chat_ratings.empathy`

Apply the same pattern to `FloatingChatWindow` if we want desktop consistency; otherwise prioritize `EmbeddedChatView`, since this request targets `/tt`.

#### 8. Unlock respect rating after two sent messages

In `EmbeddedChatView`:

- count messages sent by the current user in this chat
- disable/hide the heart rating button until at least 2 own messages exist
- when the second own message appears, trigger a one-time spark/unlock animation around the heart button
- persist the unlock animation flag per chat in `sessionStorage` or component state so it does not replay repeatedly during the same open chat

The rating remains unavailable for bot chats and blocked chats as currently appropriate.

#### 9. Localization and small polish

Update `de.json` and `en.json` with:

- scroll hint text
- 5 scale labels if not hardcoded
- respect-rating locked tooltip/hint, e.g. “Unlocked after 2 messages”
- notification permission success/blocked copy where needed

### Files expected to change

- `src/pages/TT.tsx`
- `src/hooks/useTTTopics.ts`
- `src/components/tt/TTBottomPanel.tsx`
- `src/components/tt/TTNotificationsBell.tsx`
- `src/components/tt/TTEmojiRating.tsx`
- `src/components/chat/EmbeddedChatView.tsx`
- optionally `src/components/chat/FloatingChatWindow.tsx`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`

### No backend changes needed

All requested changes can be implemented with existing tables and browser APIs. No database migration or new backend function is required.