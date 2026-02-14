

# City Theme v2 — Complete Overhaul

## What to Keep vs Discard

### KEEP (solid architecture)
- **Layer B (Semantic Token Layer)**: `src/themes/types.ts` and `src/themes/tokenizer.ts` — untouched, these are pure data transformers
- **CityRenderer.tsx** — the orchestrator structure stays, but will be updated to use the new components
- **CityEventMarker.tsx** — message animation dots, fine as-is
- **CityCluster.tsx** — cluster background ellipses, keep for now
- **ThemeContext.tsx** — DB-driven theme switching, keep and enhance

### DISCARD / REWRITE
- **CityZones.tsx** — remove entirely; replace with SVG texture ring masking using your uploaded texture images
- **CityNode.tsx** — rewrite to render `<image>` elements (your SVG house assets) instead of inline rects/polygons
- **CityEdge.tsx** — rewrite to render a sandy path texture instead of plain lines
- **house-shapes.ts** — delete entirely; replaced by SVG asset files

## Plan

### Phase 0: Asset Preparation (you do this)
- Extract both ZIPs
- Convert all EPS files to SVG
- Re-upload individual SVG files. I'll place them in `src/assets/city/`:
  - `src/assets/city/textures/zone-core.svg`
  - `src/assets/city/textures/zone-middle.svg`
  - `src/assets/city/textures/zone-outer.svg`
  - `src/assets/city/nodes/core/building-1.svg` through `building-5.svg`
  - `src/assets/city/nodes/middle/house-1.svg` through `house-5.svg`
  - `src/assets/city/nodes/outer/shack-1.svg` (basic housing)
  - `src/assets/city/nodes/inactive/tent.svg`
  - `src/assets/city/flowers/good.svg` and `bad.svg` (saved for later)

### Phase 1: Admin Theme Dropdown
- Replace the toggle in `ThemePanel.tsx` with a `<Select>` dropdown (currently only "Classic" / "City" but extensible for future themes)
- Uses the existing `useUpdateAppSetting` hook

### Phase 2: Zone Textures via Ring Masking
- Rewrite `CityZones.tsx`:
  - Define SVG `<clipPath>` rings (annulus shapes using two concentric circles and `clip-rule="evenodd"`)
  - Place each texture as a full `<image>` element clipped to its corresponding ring
  - Remove the green pastel overlay, gradients, and grid patterns entirely

### Phase 3: Node Rendering with SVG Assets
- Delete `house-shapes.ts`
- Rewrite `CityNode.tsx`:
  - Import all house SVGs as URL paths (via Vite asset imports)
  - Render `<image href={...}>` within the motion group
  - Zone-to-asset mapping:
    - **Core**: Each of the 5 buildings used exactly once (deterministic assignment by sorted bridging score rank)
    - **Middle**: Random selection from 5 houses (seeded by node ID for determinism)
    - **Outer**: Basic shack SVG
    - **Inactive**: Tent SVG
  - All images rendered at a uniform size (e.g., 48x48px, configurable)
  - **Online indicator**: SVG overlay — a small yellow/warm glow rectangle positioned at a "window" location on the house, toggled by `token.isOnline`
  - **Unread badge**: Kept as SVG overlay (envelope + count), same as current
  - **Current user glow**: Kept as animated circle

### Phase 4: Core Zone — Top 5 Enforcement
- In `tokenizer.ts`, add logic:
  - Sort all nodes eligible for `core` zone by bridging score descending
  - Only the top 5 get `zone: 'core'`
  - Remaining nodes that would qualify get placed at `zone: 'middle'` with their radial distance set to just outside `greenRadius` (core border)
- This preserves the existing top-5 leaderboard concept

### Phase 5: Sandy Path Edges
- Rewrite `CityEdge.tsx`:
  - Generate an SVG `<path>` with slight random curves (seeded by source+target IDs) for a natural look
  - Apply a sandy color (`#D4B896`) with a thick stroke and rough edges (using `stroke-dasharray` with irregular spacing or an SVG filter for grain)
  - Active paths get a warmer, brighter color
  - Pending paths remain dashed
- No external texture needed — pure SVG procedural generation

### Phase 6: Centralized Interaction Handler
- Verify and enforce: `CityNode` and `CityEdge` components only receive callback props (`onClick`, `onMouseEnter`, `onMouseLeave`) and dispatch them with semantic data (node ID, edge source/target)
- No business logic (navigation, state mutation, data fetching) inside these components
- All interaction logic lives in `CityRenderer.tsx` which maps semantic events to the centralized handlers from `OpinionGraph.tsx`
- This is already mostly the case; I'll audit and clean up any violations

### Phase 7: Future Considerations (NOT implemented now)
- **Flowers at edges**: Good/bad flower SVGs placed at edge endpoints based on bridging score — deferred
- **House variations for chat quality**: Instead of swapping entire houses, we can layer small detail overlays (e.g., garden state, window decorations) on top of the base house SVG. This avoids a huge asset library and heavy reloading. A practical approach:
  - 2-3 overlay layers (garden, window style, roof decoration) controlled by score ranges
  - Overlays are small SVGs composited on top of the base house
  - Changes animate smoothly with CSS transitions rather than full image swaps

## Technical Details

**Files to delete:**
- `src/themes/city/house-shapes.ts`

**Files to rewrite:**
- `src/themes/city/CityZones.tsx` — texture ring masking
- `src/themes/city/CityNode.tsx` — SVG asset rendering
- `src/themes/city/CityEdge.tsx` — sandy path rendering
- `src/components/admin/ThemePanel.tsx` — dropdown instead of toggle

**Files to modify:**
- `src/themes/tokenizer.ts` — top-5 core zone enforcement
- `src/themes/city/CityRenderer.tsx` — minor updates to pass new props

**Files unchanged:**
- `src/themes/types.ts`
- `src/themes/city/CityCluster.tsx`
- `src/themes/city/CityEventMarker.tsx`
- `src/themes/ThemeContext.tsx`
- `src/components/graph/OpinionGraph.tsx`

**New files:**
- `src/assets/city/` — all your SVG assets (placed after you upload them)

## Next Step
Upload the converted SVG files and I'll implement all phases.

