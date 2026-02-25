# Plan: Signal Theme Polish + Unread Messages Bug Fix

## 1. Roll Back Outer Node Shape

Revert `OuterShape` in `SignalNode.tsx` to the original small red square:

```tsx
<rect x="12" y="12" width="16" height="16" fill="#551111" stroke="none" />
```

**File:** `src/themes/signal/SignalNode.tsx`

---

## 2. Reduce Zone Opacity

In `SignalZones.tsx`, reduce the tint opacity values in the radial gradient:

- Core: `0.10` → `0.05`
- Middle: `0.08` → `0.04`
- Outer: `0.10` → `0.05`
- Ring stroke opacity: `0.30` → `0.20`
- Label opacity: `0.35` → `0.25`

**File:** `src/themes/signal/SignalZones.tsx`

---

## 3. Edge Clutter Reduction

The main visual problem: every edge (especially red pending request dashes) draws at full length across the graph, creating a web of overlapping lines.

**Proposed improvements in `SignalEdge.tsx`:**

- **Pending edges**: reduce opacity from current `0.2 + respect * 0.4` to a flat `0.12`, and reduce stroke width from `1.5` to `1`. Change the colour of the pending edges to match the colour of the accepted edges, but much dimmer. This makes unanswered requests subtle background noise rather than dominant red lines.
- **Accepted edges**: keep current opacity logic but cap the base at `0.15 + respect * 0.25` (softer than current `0.2 + 0.4`).
- **Shorten pending edges visually**: render them as short stubs (only 30% of the line from each end, leaving a gap in the middle). This dramatically reduces visual clutter while still showing the connection exists.
- **Active/highlighted edges** remain unchanged — they should pop.

**File:** `src/themes/signal/SignalEdge.tsx`

---

## 4. Fix: Unread Message Notifications Never Clear

**Root cause:** The `useUnreadMessages` hook queries for `read_at IS NULL`, but **no code anywhere sets `read_at**`. When a user opens a chat and reads messages, `read_at` stays `null` forever.

**Fix:** In `useChatMessages.ts`, add a `markAsRead` effect. When the chat is open and messages are loaded, update all unread messages from the other user to set `read_at = now()`.

```ts
// After messages load, mark other user's messages as read
useEffect(() => {
  if (!chatId || !user?.id || messages.length === 0) return;
  
  const unreadIds = messages
    .filter(m => !m.isOwn)
    .map(m => m.id);
  
  if (unreadIds.length === 0) return;

  supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)
    .is('read_at', null)
    .then(() => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    });
}, [chatId, user?.id, messages.length]);
```

**File:** `src/hooks/useChatMessages.ts`

---

## Files to Edit


| File                                | Change                                                  |
| ----------------------------------- | ------------------------------------------------------- |
| `src/themes/signal/SignalNode.tsx`  | Revert OuterShape to original small red square          |
| `src/themes/signal/SignalZones.tsx` | Reduce all zone tint + ring opacities                   |
| `src/themes/signal/SignalEdge.tsx`  | Lower edge opacity, render pending edges as short stubs |
| `src/hooks/useChatMessages.ts`      | Add effect to mark messages as read when chat is open   |
