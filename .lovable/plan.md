

## Fix: Message Animations Not Firing + forwardRef Warning

### Root Cause: Animations

The `useTopicData` hook subscribes to `chat_messages` INSERT events **without a filter**. Supabase Realtime with RLS evaluates the `is_chat_participant()` function for every row — this complex function-based RLS policy is known to silently drop events in unfiltered subscriptions. That's why `[realtime] chat_messages INSERT received` never appears in logs.

The `useChatMessages` hook (used in chat windows) subscribes **with a `chat_id` filter** and works fine.

### Fix: Broadcast-based animations

Replace the broken `chat_messages` postgres_changes listener with a Supabase Realtime **broadcast** channel (no RLS, no DB dependency):

1. **`useTopicData.ts`** — Remove the `chat_messages` postgres_changes subscription (lines 170-244). Instead, subscribe to a broadcast channel `topic-{topicId}-animations` that listens for `animation` events and adds them to `messageAnimations` state.

2. **`useChatMessages.ts`** — After a new message INSERT is detected via the existing realtime subscription (line 93 handler), broadcast the animation event on the same `topic-{topicId}-animations` channel. This requires accepting `topicId`, `myOpinionId`, and `theirOpinionId` as optional parameters.

3. **Chat components** (`FloatingChatWindow.tsx`, `EmbeddedChatView.tsx`, `FloatingChat.tsx`) — Pass `topicId`, `myOpinionId`, `theirOpinionId` to `useChatMessages`. These values are already available via `useChatSession`.

### Fix: forwardRef Warning

**`SignalZones.tsx`** — Wrap with `React.forwardRef` (or more likely, the issue is that `AnimatePresence` or framer-motion tries to pass a ref). Actually, looking at `SignalRenderer`, `SignalZones` is used directly in JSX — the warning suggests something is passing a ref to it. The fix is to wrap `SignalZones` in `forwardRef` to suppress the warning.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useTopicData.ts` | Remove `chat_messages` subscription; add broadcast listener |
| `src/hooks/useChatMessages.ts` | Add broadcast emit on new message; accept opinion/topic params |
| `src/hooks/useChatSession.ts` | Expose `topicId` (likely already available) |
| `src/components/chat/FloatingChatWindow.tsx` | Pass opinion IDs + topicId to `useChatMessages` |
| `src/components/chat/EmbeddedChatView.tsx` | Same |
| `src/components/chat/FloatingChat.tsx` | Same |
| `src/themes/signal/SignalZones.tsx` | Wrap with `forwardRef` |

