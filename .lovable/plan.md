

# UI Fixes and Improvements (Updated)

## 1. Fix Flash of Mock Data and "Add Opinion" Button on Reload

In `src/pages/Index.tsx`:
- Change `useMockData={!hasRealData}` to `useMockData={false}`
- Gate the "Add Opinion" button with `!isLoading` so it only appears once data is fetched

## 2. Increase Inactive Zone Opacity

In `src/themes/signal/SignalZones.tsx`:
- Add a subtle tint (`rgba(50, 57, 78, 0.15)`) in the 85%-100% range of the radial gradient so the inactive ring is visually distinct from the outer/red zone

## 3. Fix Node/Edge Deselection Highlighting

In `src/components/graph/OpinionGraph.tsx` and `src/pages/Index.tsx`:
- Remove OpinionGraph's internal `selectedNode` state
- Add a `selectedNodeId` prop to OpinionGraph, passed from Index
- This makes Index the single source of truth -- clearing selection in Index also clears highlights on nodes and edges

## 4. Mobile: Move Title Out of Header, Place Above Graph

In `src/components/Header.tsx` and `src/pages/Index.tsx`:
- Remove the mobile title row from Header
- Add a centered title element above the graph on mobile in Index

## 5. Bigger Desktop Buttons (Opinion List + Chat List)

In `src/components/Header.tsx`:
- Increase to `h-14 w-14` with `h-6 w-6` icons on desktop

## 6. Opinion Count + Chat Count at Bottom Center of Graph

In `src/pages/Index.tsx`:
- Remove count badges from Header
- Add a centered stats bar below the graph showing "X Opinions / Y Chats" as subtle pill badges, positioned with `absolute bottom-2 left-1/2 -translate-x-1/2`

## 7. Fix Zone Visual/Logic Mismatch (Core Zone Rendering)

Two parts:

**a) Align gradient to config ratios** in `src/themes/signal/SignalZones.tsx`:
- Replace hardcoded gradient percentages (25%, 60%, 85%) with values computed from the layout config:
  - `corePercent = (greenRadius / outerRadius) * 100` (~35%)
  - `middlePercent = (yellowRadius / outerRadius) * 100` (~80%)
  - `outerPercent = (pinkRadius / outerRadius) * 100` (~92%)
- Update ALL radial-gradient stops to use these computed values

**b) Add distance-based core fallback** in `src/themes/tokenizer.ts`:
- Add `if (dist <= config.greenRadius) return 'core';` before the `yellowRadius` check in `resolveZone()`
- Ensures any node physically inside the green radius gets the core-zone rendering

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove mock data, gate add-opinion on loading, add mobile title above graph, add stats bar below graph, pass selectedNodeId to OpinionGraph |
| `src/components/graph/OpinionGraph.tsx` | Accept `selectedNodeId` prop, remove internal selectedNode state |
| `src/components/Header.tsx` | Remove mobile title row, remove count badges, increase button sizes on desktop |
| `src/themes/signal/SignalZones.tsx` | Compute gradient percentages from config, increase inactive zone opacity |
| `src/themes/tokenizer.ts` | Add distance-based core zone fallback in resolveZone |

