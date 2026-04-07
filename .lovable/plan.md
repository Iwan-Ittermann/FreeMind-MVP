

# Graph & Layout Batch — Implementation Plan

This batch covers: 1-minute recalculation debounce, cluster analysis with cake slices, opinion sidebar sorting by circle order (animated), hide-by-chat-age filter, and first-rating dampening.

---

## 1. One-Minute Recalculation Debounce

**Problem**: Every realtime event (new rating, new opinion, chat activity) triggers an immediate graph recalculation, causing constant visual reshuffling.

**Approach**: Add a debounce layer between data fetches and layout computation. The graph data will still be fetched in real-time, but the *layout inputs* (opinions + ratings snapshot) fed to `calculateLayout` will only update when a 60-second cooldown has elapsed since the last change.

**Files**:
- `src/pages/Index.tsx` — introduce a `useStableLayoutData` hook (or inline logic) that buffers `topicData.opinions` and `topicData.ratings` behind a 60-second timer. The timer resets on every new data change. Only when it reaches zero do the buffered values propagate to `OpinionGraph`.

**Contradiction risk**: None. Data fetching remains real-time (sidebar lists, unread counts, chat content all update immediately). Only the *graph visualization* is debounced. The opinion sidebar sorting (step 3) will use the same stable snapshot so both stay in sync.

---

## 2. First-Rating Dampening

**Problem**: A user's first respect rating can catapult them to the center of the graph, which feels jarring.

**Approach**: Modify `calculateFreeMindScore` in `src/lib/freemind-layout.ts` to apply a dampening multiplier based on chat count:
- 1st chat: multiply bridging score contribution by **1/3** (deduct 2/3)
- 2nd chat: multiply by **1/2** (deduct half)
- 3rd+ chat: full weight (no dampening)

**Files**:
- `src/lib/freemind-layout.ts` — update `calculateFreeMindScore` to weight each rating's contribution by its ordinal position.

---

## 3. Cluster Analysis + Cake Slices

**Problem**: No visual grouping of opinions into clusters on the graph.

**Approach**: 
- Implement DBSCAN clustering on node positions after layout is computed, inside `calculateLayout`.
- Assign `clusterId` to each `GraphNode`.
- In each theme renderer, draw translucent "cake slice" wedges behind the nodes. Each cluster's angular extent (min angle to max angle at its radial range) defines a pie/wedge shape drawn from center outward.

**Files**:
- `src/lib/freemind-layout.ts` — add DBSCAN function, assign `cluster` property to nodes in `calculateLayout`.
- `src/themes/signal/SignalRenderer.tsx` (and other renderers) — add a `ClusterWedges` layer that draws SVG `<path>` arcs for each cluster with a distinct translucent color.
- `src/types/graph.ts` — `cluster` field already exists on `GraphNode`.

**Cluster wedge rendering**: For each cluster, compute the angular range (min/max angle of member nodes) and radial range (min/max radius). Draw an arc/wedge from center using those bounds with ~10px padding, filled with a translucent zone-themed color.

---

## 4. Opinion Sidebar Sorting by Circle Order

**Problem**: Opinions are sorted by `created_at` in the sidebar, not matching the graph's angular order.

**Approach**: 
- Pass the computed node angles (from layout) to `OpinionsSidebar` as a prop or via context.
- Sort opinions by their angular position (clockwise from 12 o'clock).
- Animate reordering using `framer-motion`'s `AnimatePresence` + `layout` prop on each opinion item.

**Files**:
- `src/pages/Index.tsx` — compute and pass `nodeAngles: Map<string, number>` derived from the stable layout data.
- `src/components/OpinionsSidebar.tsx` — accept `nodeAngles` prop, sort `filteredOpinions` by angle, wrap items in `motion.div` with `layout` animation.

---

## 5. Hide-by-Chat-Age Filter

**Problem**: No way to filter out stale opinions that haven't had any chat activity.

**Approach**: Add a filter slider to the settings sidebar (MainMenu) with options: "Show all", "Had chats in last 4 weeks", "3 weeks", "2 weeks", "1 week". Store the selection in component state (or localStorage for persistence).

**Implementation**:
- Add a "Chat Activity Filter" slider/select to `MenuContent` in `src/components/MainMenu.tsx`.
- Store the filter value in a React state lifted to `Index.tsx` and passed down to `OpinionGraph`.
- In `OpinionGraph` or `Index.tsx`, filter `topicData.opinions` before passing to the graph, removing opinions whose last chat activity is older than the threshold. This requires knowing each opinion's last chat timestamp — either from the existing data or a lightweight query.

**Files**:
- `src/components/MainMenu.tsx` — add filter UI (a labeled slider with 5 stops: All / 4w / 3w / 2w / 1w).
- `src/pages/Index.tsx` — state + filtering logic.
- May need to extend `useTopicData` to include last-chat-activity per opinion (from `chat_messages` timestamps).

---

## Technical Notes

- The 60-second debounce and the sorted sidebar will share the same stable snapshot, preventing contradictions.
- DBSCAN epsilon and minPoints will need tuning — initial values: eps = 60px (scaled to graph size), minPoints = 2.
- The dampening formula is applied per-rating in order of chat creation time, so we need to sort ratings by their associated chat's `created_at` before computing the weighted average.
- Cake slice colors will reuse the existing cluster color palette from `cluster-visualization-v2` memory.

