

## Plan: Remove Chat Requests from /tt, Enable Direct Chat + Block Button

### Overview
Remove the chat request flow from the TT (TikTok-style) view. Tapping "Let's Chat" on a selected opinion will immediately open the chat in the right side panel. A block/unblock button will be added to the EmbeddedChatView header so users can block chat partners directly.

### What changes

**1. `src/pages/TT.tsx`** (edit)
- Remove `useChatRequests` import and usage (`sendRequest`, `hasPendingRequest`, `hasAcceptedChat`).
- Remove `toast` import (no longer needed here).
- Add a `useRef<TTSideTabsHandle>` to imperatively open a chat in the side panel.
- Change `onLetsChat` handler: instead of sending a request, call `sideTabsRef.current?.openChat(targetOpinionId)`.
- Remove `pendingRequests` from `TTSideTabs` props.

**2. `src/components/tt/TTSideTabs.tsx`** (edit)
- Export a `TTSideTabsHandle` interface with `openChat(opinionId: string)`.
- Wrap with `forwardRef` and expose `openChat` via `useImperativeHandle`.
- Remove the `pendingRequests` prop, `useChatRequests` import, and all request-related state (`rightTab`, `acceptRequest`, `declineRequest`, `handleAcceptAndOpen`, `incomingCount`).
- Remove the "Requests" tab toggle from the right panel. The right panel shows only the chat list.
- Remove request list rendering entirely.

**3. `src/hooks/useTTChats.ts`** (edit)
- Remove the `pendingRequests` query and the `TTPendingRequestItem` interface.
- Remove the `chat_requests` realtime subscription from the channel.
- Return only `{ chats, myOpinionId }`.

**4. `src/components/chat/EmbeddedChatView.tsx`** (edit)
- Import `Ban` and `Unlock` from lucide-react.
- Destructure `blockUser`, `unblockUser`, `isBlocking`, `isUnblocking` from the existing `useUserBlocks` hook (already imported but not fully used).
- Add a block/unblock button in the header area (next to the "Their opinion" section), matching the style from `FloatingChat.tsx`.

**5. `src/components/tt/TTBottomPanel.tsx`** (no change)
- The `onLetsChat` callback signature stays the same. The parent (TT.tsx) changes what happens when it's called.

### Files summary

| File | Change |
|------|--------|
| `src/pages/TT.tsx` | Remove `useChatRequests`, add `sideTabsRef`, direct chat opening |
| `src/components/tt/TTSideTabs.tsx` | `forwardRef` + `openChat`, remove requests tab |
| `src/hooks/useTTChats.ts` | Remove pending requests query + type |
| `src/components/chat/EmbeddedChatView.tsx` | Add block/unblock button to header |

### Not changed
- The original `/topic/:slug` (Index) page keeps its request-based flow unchanged.
- The `useChatRequests` hook itself is not deleted (still used by Index, OpinionsSidebar, ChatsSidebar).
- The `chat_requests` table and RLS policies remain (still used outside TT).

