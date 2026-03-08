

## Fixes: Sidebar Headers, Background, Title Centering, Node Scaling

### 1. Remove inline header from OpinionsSidebar

**File: `src/components/OpinionsSidebar.tsx`** (lines 137-143)

Delete the `variant === 'inline'` header block (icon, "All Opinions" text, counter). The sidebar will start directly with the search bar.

### 2. Remove opinion count badge from BottomTabBar

**File: `src/components/BottomTabBar.tsx`**

- Remove the `opinionCount` prop and the badge rendering (lines 30-34).

### 3. Background to white

**File: `src/pages/Index.tsx`**

- Change root div `bg-[#1A1A2E]` to `bg-white dark:bg-[#1A1A2E]`.
- Change desktop left panel `bg-[#1A1A2E]/60` to `bg-white/60 dark:bg-[#1A1A2E]/60`.

### 4. Center title in header

**File: `src/components/Header.tsx`**

- Title: change from `text-left` flex item to `absolute left-1/2 -translate-x-1/2` centered, with `max-w-[60%] truncate text-center`. Logo stays at left edge.

### 5. Scale nodes with graph size

**File: `src/components/graph/OpinionGraph.tsx`** (line 69)

Currently `nodeRadius: 6` is fixed. Make it scale: `nodeRadius: Math.max(3, size * 0.012)`. This means on a 600px graph it's ~7, on a 200px graph it's ~3.

**File: `src/themes/signal/SignalNode.tsx`**

The signal theme uses a fixed `NODE_SIZE = 40`. Pass `scale` factor from the graph (based on `nodeRadius / 6`) and apply `transform: scale(factor)` to the node SVG group. This requires:
- Adding a `scale` prop to `SignalNode` 
- Applying it in `SignalRenderer` based on `config.nodeRadius`

### Files Summary

| File | Changes |
|------|---------|
| `src/components/OpinionsSidebar.tsx` | Remove inline header (icon + text + counter) |
| `src/components/BottomTabBar.tsx` | Remove opinion count badge |
| `src/pages/Index.tsx` | White background |
| `src/components/Header.tsx` | Center title on both mobile and desktop |
| `src/components/graph/OpinionGraph.tsx` | Scale `nodeRadius` with graph size |
| `src/themes/signal/SignalNode.tsx` | Accept and apply scale factor |
| `src/themes/signal/SignalRenderer.tsx` | Pass scale from config to nodes |

