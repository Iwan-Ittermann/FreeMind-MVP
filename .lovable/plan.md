## Analysis and Plan

---

### 2. Show pending edges only to the involved user

**Feasibility assessment**: This is safe and does NOT break determinism.

The pending edges are added as a post-processing step in `OpinionGraph.tsx` (lines 89-127), **after** the deterministic layout is computed. Pending edges do not affect node positions at all — they are purely visual overlays. Filtering them per-user changes nothing about the layout algorithm.

**Current behavior**: All pending requests for the topic are fetched and rendered as dashed edges for everyone.

**Proposed change**: In `OpinionGraph.tsx`, filter `chatRequests` to only include requests where the current user's opinion is either the requester or the target. This means:

- User A sends request to User B → only A and B see that dashed edge
- Everyone else sees no pending edge

**File**: `src/components/graph/OpinionGraph.tsx`

- Filter `chatRequests` before creating `pendingEdges`: only keep requests where `requesterOpinionId === currentUserOpinionId` or `targetOpinionId === currentUserOpinionId`.

Same filtering should be applied in the themed renderers' edge tokenization (already done via `edgeTokens` in `SignalRenderer`, `ArcaneRenderer`, `CityRenderer`) since they receive the already-filtered edge array from `OpinionGraph`.

No layout/determinism impact. No database changes needed.

---

### 3. Prevent node overlap (collision avoidance)

**Assessment**: Adding a post-layout collision resolution step is feasible and safe.

The layout algorithm (`freemind-layout.ts`) positions nodes by radius and angle. Nodes can end up close together, especially in crowded zones. A simple repulsion pass after positioning can push overlapping nodes apart angularly.

**Key concern — zone crossing**: If we only adjust angles (not radii), nodes stay in their assigned zones. This is the safe approach. We should NOT adjust radii during collision resolution.

**Proposed approach**:

- After all nodes are positioned (end of `calculateLayout`), run a collision pass
- For each pair of nodes, if their distance is less than `2 * nodeRadius + padding`, rotate one slightly along its current radius
- Only modify angles, never radii — this guarantees no zone crossing
- Use a few iterations (5-10) for convergence

**File**: `src/lib/freemind-layout.ts`

- Add a `resolveCollisions(nodes, config)` function that adjusts angles only
- Call it before the bot-position fixup at the end of `calculateLayout`

---

### 4. Pending requests in chat sidebar

**Finding**: The `ChatsSidebar` component (`src/components/ChatsSidebar.tsx`) queries the `chats` table — it only shows conversations that have an actual `chats` row. Pending requests do NOT create a `chats` row (that only happens on acceptance via `get_or_create_chat`).

**Conclusion**: Pending requests are NOT shown in the chat sidebar. Only accepted/active chats appear there.   
  
CHANGE REQUIRED: Please include a pending chat request in the chat sidebar. Also inlcude two radio buttons in the chatssidebar so the user can filter for chats or requests. 

---

### Summary of changes


| #   | Change                                    | Files                | Risk                               | &nbsp; | &nbsp; | &nbsp; |
| --- | ----------------------------------------- | -------------------- | ---------------------------------- | ------ | ------ | ------ |
| 1   | Default `hidePendingEdges` to `true`      | `ThemeContext.tsx`   | None                               | &nbsp; | &nbsp; | &nbsp; |
| 2   | Filter pending edges to current user only | `OpinionGraph.tsx`   | None (post-layout only)            | &nbsp; | &nbsp; | &nbsp; |
| 3   | Angular collision resolution              | `freemind-layout.ts` | Low (angle-only, no zone crossing) | &nbsp; | &nbsp; | &nbsp; |
| 4   | Pending requests                          | &nbsp;               | &nbsp;                             | &nbsp; | &nbsp; | &nbsp; |
