
# Part 2: Floating Chat Windows with Inline Rating UX

## Layout (Updated per your feedback)

```text
                                                                    [bubble]
                                                                    [bubble]
[Chat #3]  [Chat #2]  [Chat #1]  [bubble]
[settings]
```

- **Settings button**: moves to **bottom-left** corner
- **Minimized chat bubbles**: stack **vertically** along the right screen edge, with the lowest one at the bottom-right
- **Expanded floating windows**: stack **horizontally to the left** of the minimized bubbles column, anchored at the bottom

## Rating UX: "Rate!" Toggle Button

In each floating chat window, the message input bar contains a **"Rate!" / "Bewerten!"** button. When tapped:
- The message list area smoothly transitions to show **two horizontal rating sliders** (Respect + Disagreement)
- Sliders initialize from the user's **existing saved rating** (from `chat_ratings` table via `useChatSession.existingRating`), not defaults
- A "Save & Close" button saves the rating AND collapses back to messages
- An "X" button collapses without saving
- The "Rate!" button gently pulses if the user has never rated this chat

## New Components

### `FloatingChatManager.tsx`
- Manages state: `openChats: Array<{ theirOpinionId, isMinimized }>`
- Persists to `sessionStorage`
- Max 3 expanded; extras auto-minimize
- Renders `FloatingChatWindow` and `MinimizedChatBubble` components

### `FloatingChatWindow.tsx`
- 360px wide, 480px tall, fixed bottom-right (stacking left)
- Reuses `useChatSession`, `useChatMessages`, `useTypingIndicator`, `useUserBlocks`
- Internal `isRatingOpen` state toggles between message view and rating view
- Rating sliders use existing `RatingSliders` component pattern (horizontal `Slider` from radix)
- Header: truncated opinion text + minimize + close buttons
- Footer: text input + "Rate!" button + send button

### `MinimizedChatBubble.tsx`
- 48x48 circle, first letter of their opinion as avatar
- Unread count badge (red dot with number)
- Click to expand

## Modified Files

### `Index.tsx`
- Import `FloatingChatManager`, render alongside existing UI
- On desktop: `handleOpenChat` calls `openChat(theirOpinionId)` instead of `navigate`
- On mobile: keeps `navigate('/chat?their=...')`
- Settings button moves from `bottom-6 right-6` to `bottom-6 left-6`

### `ChatsSidebar.tsx`
- Accept optional `onChatOpen?: (theirOpinionId: string) => void`
- On desktop, call it instead of navigating

### `Header.tsx`
- Pass `onChatOpen` callback through to `ChatsSidebar`

### i18n files
- Add `"rate"`, `"saveAndClose"` strings to both `en.json` and `de.json`

## Technical Notes
- No database changes needed -- all window state is client-side
- `useIsMobile()` (768px breakpoint) determines floating vs full-page behavior
- `useChatSession` already fetches `existingRating` with real-time subscription, so sliders always show the latest saved values
