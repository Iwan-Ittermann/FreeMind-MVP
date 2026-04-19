

## Plan

### 1. Starter capital → Level 3

In `src/lib/tt-layout.ts`:
- Change `STARTER_POINTS = 10` → `STARTER_POINTS = 50` (lower bound of Level 3 band `50..249`).
- Update bot-pin radius from `ttLevelToRadius(2, …)` to `ttLevelToRadius(3, …)`.
- Update header comment table to reflect Level 3 as starter.

### 2. Visible level rings (thin white lines)

Add concentric guide circles inside the graph SVG so they share the graph's coordinate system (centered, scale exactly with the graph wrapper).

In `src/components/graph/OpinionGraph.tsx`:
- When `ttMode && ttLandmarks` is set, render a thin guide layer (just inside the existing `<svg>`, before nodes/edges) drawing one circle per level.
- Reuse `ttLevelToRadius` from `tt-layout.ts` (export a small helper `getTTLevelRadii(landmarks)` that returns `{ level, r }[]` for levels 1–10 and –1, –2, –3, plus the level-10 inner orbit radius when relevant).
- Style: `stroke="white"` `stroke-opacity="0.35"` `stroke-width="0.75"` `fill="none"`. Skip Level 10 if its radius is 0.
- Suppress level rings in the white-band gap (between blueR and whiteR) — none exist there anyway by construction.

This keeps the rings visually aligned with both background landmarks and node positions because all three (background, rings, nodes) use the same center.

### 3. Fix the chat sidebar (right tab in `TTSideTabs`)

Currently `TT.tsx` passes `chats={[]}` (hardcoded) and no tap handler. The right side tab opens an empty list with no way to access conversations.

Approach: reuse the existing chat data + view stack (`ChatsSidebar` patterns) but keep TT's lightweight visual style.

In `src/pages/TT.tsx`:
- Replicate the data fetching from `ChatsSidebar.tsx` (myOpinion → chats with last message, polling every 4s) inside a small new hook `useTTChats(topicId)` in `src/hooks/useTTChats.ts` to avoid duplication. Returns `{ id, opinionText, lastMessage }[]` matching `TTSideTabs`'s shape.
- Pass result as `chats` to `<TTSideTabs>`.

In `src/components/tt/TTSideTabs.tsx`:
- Add a new prop `activeChatOpinionId: string | null` and an internal "expanded chat" view. When a chat row is tapped, swap the panel's body to render `<EmbeddedChatView theirOpinionId={...} />` with a back arrow header (mirrors `ChatsSidebar` lines ~270–283).
- The right panel's `width`/`height` is already constrained; give the chat view `flex-1 min-h-0 overflow-hidden` so the embedded chat scrolls inside it.
- Pending requests: include them in the same panel (small section above chats) so users can accept/decline. Reuse `useChatRequests(topicId).acceptRequest/declineRequest`. Mirror the request row styling already in `ChatsSidebar`.

In `src/pages/TT.tsx`:
- Wire `onChatTap` from `TTSideTabs` to update local state used by the same sidebar (we keep state inside `TTSideTabs` itself — simpler: it already manages `side` open/close; add `activeChatId` state there).

### 4. Files

| File | Change |
|---|---|
| `src/lib/tt-layout.ts` | `STARTER_POINTS = 50`; bot pin → level 3; export `getTTLevelRadii(landmarks)`. |
| `src/components/graph/OpinionGraph.tsx` | When TT mode, render thin white concentric rings using `getTTLevelRadii`. |
| `src/hooks/useTTChats.ts` (new) | Fetch user's chats + last message + pending requests for a topic. Returns shape consumed by side tabs. |
| `src/components/tt/TTSideTabs.tsx` | Render real chats list; tap → embedded chat view with back arrow; render pending-requests subsection with accept/decline. |
| `src/pages/TT.tsx` | Use `useTTChats(activeTopicId)`; pass chats + pending to `<TTSideTabs>`. |

### 5. Out of scope
- Floating windows (TT uses single embedded view).
- Unread badges in the side tab (defer).
- Animating between old/new starter ring positions.

