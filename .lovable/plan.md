
# UI Fixes and Improvements

## 1. Message Animation (White Dot Traveling Between Nodes)

The animation infrastructure already exists (`SignalEventMarker.tsx`, `MessageDots.tsx`). The dot color is currently `#00D4FF` (cyan). Change it to **white (`#FFFFFF`)** in `SignalEventMarker.tsx` and `MessageDots.tsx` for consistency.

**Files:** `src/themes/signal/SignalEventMarker.tsx`, `src/components/graph/MessageDots.tsx`

---

## 2. Remove All Success Toast Notifications

Remove `toast.success(...)` calls from user-facing actions across these files:

| File | Toast to remove |
|------|----------------|
| `src/pages/Index.tsx` (lines 117, 130, 143) | Chat request sent/accepted/declined |
| `src/components/SubmitOpinion.tsx` (line 70) | Opinion submitted |
| `src/components/SubmitOpinionDialog.tsx` (line 68) | Opinion submitted |
| `src/components/chat/FloatingChatWindow.tsx` (line 83) | Rating saved |
| `src/pages/Chat.tsx` (line 50) | Rating saved |
| `src/components/OpinionsSidebar.tsx` (lines 100, 112, 126) | Chat request sent/accepted/declined |

Admin-only toasts (Admin.tsx, TopicPanel.tsx, etc.) will be kept.

**Files:** 6 files listed above

---

## 3. Core Zone Nodes Not Rendered with Correct SVG

The `resolveZone()` function in `src/themes/tokenizer.ts` correctly checks `node.zone === 'green'` and returns `'core'`. However, the layout in `freemind-layout.ts` only sets `zone: 'green'` on active nodes (line 505). The issue is that the `scoreToRadius` snapping logic may push core-qualifying nodes outward past `greenRadius`, so `resolveZone` falls back to distance-based check and assigns `'middle'`. 

**Fix:** In `resolveZone()`, also check `node.isBridge` as a fallback (since `isBridge` is set when score > 2500). This ensures core nodes always get the core shape regardless of snapping artifacts.

**File:** `src/themes/tokenizer.ts`

---

## 4. Nodes Pushed Beyond Outer Zone (Into Inactive Line)

In `scoreToRadius()` (line 432), `maxRadius` is set to `config.outerRadius - config.nodeRadius`. But the zone border snapping can push nodes outward past `pinkRadius` into the inactive zone. 

**Fix:** After snapping, clamp the radius to stay within `[minRadius, config.pinkRadius - pad]` for active nodes. This ensures no active node extends beyond the pink/outer zone boundary. The `scoreToRadius` function needs the `hasChats` context, or the clamping should be applied at the call site.

Simpler approach: just clamp `maxRadius` to `config.pinkRadius - config.nodeRadius` so the linear mapping never reaches the inactive zone.

**File:** `src/lib/freemind-layout.ts`

---

## 5. Z-Index: Nodes Must Render Above Edges

In `SignalRenderer.tsx`, nodes already render after edges (lines 111-136), which means they are naturally on top in SVG (later elements paint on top). The render order is: Zones -> Edges -> EventMarkers -> Nodes. This is correct.

However, the `SignalEventMarker` (flying dots) renders between edges and nodes (line 122). Move it **after** the nodes group so the dots fly visually on top of everything.

**File:** `src/themes/signal/SignalRenderer.tsx`

Also verify the classic theme in `OpinionGraph.tsx` -- currently edges render before nodes (correct), but `MessageDots` renders between them. Move `MessageDots` after `GraphNodes`.

**File:** `src/components/graph/OpinionGraph.tsx`

---

## 6. Click Empty Space to Deselect Node

The `handleBackgroundClick` in `Index.tsx` (line 103-108) already tries to deselect, but it excludes clicks on `<svg>` elements (`!target.closest('svg')`). Since the entire graph is an SVG, clicking empty space inside the graph never deselects.

**Fix:** Instead of excluding all SVG clicks, check if the click target is the SVG background rect or the SVG element itself (not a node/edge). Replace `!target.closest('svg')` with a check for `!target.closest('[data-opinion-panel]') && !target.closest('button')` only, and remove the SVG exclusion. Additionally, add an `onClick` handler to the SVG background rect in `SignalRenderer.tsx` that calls `onNodeClick(null)` or a new `onBackgroundClick` callback.

Simpler approach: Add an invisible rect covering the full SVG in `SignalRenderer.tsx` that calls a deselect callback on click. Pass `onBackgroundClick` from `OpinionGraph` -> `SignalRenderer`.

**Files:** `src/pages/Index.tsx`, `src/themes/signal/SignalRenderer.tsx`, `src/components/graph/OpinionGraph.tsx`

---

## 7. "YOU" Indicator -- Red, Round, Top-Right Corner

Currently the "YOU" flag is a rectangular banner below the node with a flagpole. Replace it with a small red circle badge positioned at the top-right corner of the node, containing white "YOU" text.

**File:** `src/themes/signal/SignalNode.tsx` (lines 112-120)

---

## 8. Desktop Accept Button Opens Floating Chat Instead of /chat

In `Index.tsx` line 131, `handleAcceptRequest` always navigates to `/chat?their=...`. On desktop, it should instead open a floating chat window.

**Fix:** After accepting, check `isMobile`: if mobile, navigate; if desktop, call `chatManagerRef.current?.openChat(selectedNode.id)` and clear the selected node.

**File:** `src/pages/Index.tsx`

Also fix the same issue in `OpinionsSidebar.tsx` (line 113) -- on desktop, it should call the `onChatOpen` callback instead of navigating.

**File:** `src/components/OpinionsSidebar.tsx`

---

## 9. Mobile Header -- Title Overlapping

The title is absolutely positioned (`absolute left-1/2 transform -translate-x-1/2`) which can overlap with the logo and buttons on small screens. The `max-w-[50%]` constraint is not enough on mobile.

**Fix:** On mobile, remove the absolute positioning. Instead, use a flex layout where the logo, title, and buttons are in a row with the title truncated in the center. Alternatively, stack the header: logo + buttons on one row, title below on mobile.

Better approach: Keep the absolute center positioning but reduce `max-w` on mobile and ensure proper text sizing. Change from `text-sm` to `text-xs` on mobile and reduce `max-w-[50%]` to `max-w-[40%]` on small screens. Also ensure the badges wrap properly.

**File:** `src/components/Header.tsx`

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/themes/signal/SignalEventMarker.tsx` | White dot color |
| `src/components/graph/MessageDots.tsx` | White dot color, move after nodes |
| `src/pages/Index.tsx` | Remove success toasts, fix accept on desktop, fix background click |
| `src/components/SubmitOpinion.tsx` | Remove success toast |
| `src/components/SubmitOpinionDialog.tsx` | Remove success toast |
| `src/components/chat/FloatingChatWindow.tsx` | Remove rating saved toast |
| `src/pages/Chat.tsx` | Remove rating saved toast |
| `src/components/OpinionsSidebar.tsx` | Remove success toasts, fix accept on desktop |
| `src/themes/tokenizer.ts` | Fix core zone detection via `isBridge` |
| `src/lib/freemind-layout.ts` | Clamp active node radius below pinkRadius |
| `src/themes/signal/SignalRenderer.tsx` | Move event markers after nodes, add background click handler, z-order |
| `src/components/graph/OpinionGraph.tsx` | Move MessageDots after GraphNodes, pass background click, z-order |
| `src/themes/signal/SignalNode.tsx` | Red round "YOU" badge at top-right |
| `src/components/Header.tsx` | Fix mobile title overlap |
