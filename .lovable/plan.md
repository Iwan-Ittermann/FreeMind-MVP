
# Fix City Theme: Backgrounds, Performance, and Texture Alignment

## Problem Analysis

### 1. Black/Inverted Backgrounds on Core Buildings and Tent
The core building and tent SVGs (from EPS conversion) use a **stencil pattern**: a single `<path>` element with `fill="#000000"` where the first sub-path fills the entire canvas as a black rectangle, and subsequent sub-paths cut out the building shape via winding direction. The result: black canvas with the building as a transparent cutout -- appearing "inverted."

The middle houses have a different, simpler format: a separate first `<path fill="#FEFEFE">` draws the white background, followed by colored paths for the actual house. The `mixBlendMode: 'multiply'` trick makes the white mostly transparent but fails for the black-background stencil SVGs.

### 2. Slow Loading and Hover Performance
Three causes identified:
- **Per-edge SVG filters**: Each `CityEdge` creates its own `<filter>` with `feTurbulence` + `feDisplacementMap` -- these are computationally expensive and multiply with every edge
- **Framer Motion spring animations on every node**: Each node has 4 separate spring transitions (opacity, scale, x, y) recalculating on every render
- **Hover triggers re-render cascade**: `onMouseEnter/onMouseLeave` on every node triggers state changes that re-evaluate `isHighlighted`/`isDimmed` for ALL nodes and edges

### 3. Core Texture Misaligned
The core zone texture image is positioned at `(centerX - outerRadius, centerY - outerRadius)` -- needs a leftward and upward offset.

## Solution

### No API needed for background removal
Since we have full access to the SVG source files, we can edit them directly. No external background-removal API is necessary.

### Step 1: Fix SVG Backgrounds (edit 12 SVG files)

**Middle houses (house-1 through house-5) + shack + flower (7 files):**
- Delete the first `<path>` element (the one with `fill="#FEFEFE"` that draws a full-canvas white rectangle)
- All remaining paths have their own colors and will render on transparent background

**Core buildings (building-1, building-2, building-3) + tent (4 files):**
- These have a single compound `<path fill="#000000">` where the background rectangle is the first sub-path
- Remove the background rectangle sub-path from the path data (the `M0 ... z` prefix)
- Convert subsequent relative `m` commands to absolute `M` commands to maintain correct positioning
- Change `fill="#000000"` to a warm brown like `fill="#4E342E"` so buildings look natural against the sandy textures
- The remaining sub-paths will render as the building silhouette on transparent background

### Step 2: Remove mixBlendMode
Once backgrounds are truly removed from the SVGs, the `mixBlendMode: 'multiply'` workaround in `CityNode.tsx` is no longer needed and can be removed. This also improves rendering performance since blend modes are GPU-intensive.

### Step 3: Performance Fixes

**CityEdge.tsx -- Remove per-edge SVG filters:**
- Delete the `<defs><filter>` block with `feTurbulence` and `feDisplacementMap` from each edge
- Remove `filter={...}` from the path element
- The sandy appearance is already conveyed by the color and stroke style; the grain filter adds negligible visual value at huge performance cost

**CityNode.tsx -- Simplify animations:**
- Replace framer-motion spring transitions with simpler `duration`-based transitions (or CSS transitions)
- Remove the `initial={{ scale: 0 }}` entrance animation that fires on every mount
- Keep the animated overlays (online glow, unread pulse) but use CSS keyframes instead of framer-motion `animate` arrays

**CityRenderer.tsx -- Debounce hover:**
- Wrap `handleNodeHover` in a lightweight debounce (50-100ms) to prevent rapid re-renders when the mouse moves across multiple nodes quickly

### Step 4: Adjust Core Texture Position
In `CityZones.tsx`, offset the core zone texture image:
- Shift the `x` attribute leftward by ~15-20px
- Shift the `y` attribute upward by ~15-20px
- Only applies to the `core` zone; middle and outer zones stay centered

## Technical Details

**Files to edit:**
- `src/assets/city/nodes/core/building-1.svg` -- remove background sub-path, change fill color
- `src/assets/city/nodes/core/building-2.svg` -- same
- `src/assets/city/nodes/core/building-3.svg` -- same
- `src/assets/city/nodes/inactive/tent.svg` -- same
- `src/assets/city/nodes/middle/house-1.svg` through `house-5.svg` -- delete first path element
- `src/assets/city/nodes/outer/shack-1.svg` -- delete first path element
- `src/assets/city/flowers/flower.svg` -- delete first path element
- `src/themes/city/CityNode.tsx` -- remove mixBlendMode, simplify animations
- `src/themes/city/CityEdge.tsx` -- remove SVG filters
- `src/themes/city/CityZones.tsx` -- offset core texture position
- `src/themes/city/CityRenderer.tsx` -- add hover debounce
