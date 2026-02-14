

# Fix City Theme: Black Nodes, Glitches, Performance, and Zone Textures

## Issues Found

### 1. Black Core Buildings and Tent
Buildings 1, 3, and the tent SVGs have their artwork filling the entire canvas with no margins. At 48x48px, they render as solid dark brown (#4E342E) blocks -- appearing "completely black." Building-2 works because its content is centered with transparent margins around it.

**Fix:** Temporarily use building-2 for all core building slots (it renders correctly at 48px). For the tent, create a simple inline SVG tent shape directly in CityNode.tsx. Mark both with TODO for when properly-cropped SVG assets are provided.

### 2. Yellow Ring Glitch (Chat Request Indicators)
The `animate-ping` CSS class creates an infinite scale+fade animation that pulses aggressively every frame. Combined with the mock data flash (below), this creates a "flying out" effect.

**Fix:** Replace `animate-ping` with a custom CSS keyframe animation: a gentle opacity pulse at a slower interval (2s), no scale transform.

### 3. Mock Data Flash on Load
In `OpinionGraph.tsx` (line 70), when `externalOpinions` is empty during initial load, the component falls back to `generateMockData(100)` -- rendering 100 mock nodes momentarily. Once real data arrives, it re-renders with actual nodes. This causes a visible flash and wastes rendering time.

**Fix:** When `externalOpinions` is not yet loaded (undefined/empty and not explicitly `useMockData`), render nothing or a minimal loading skeleton instead of 100 mock nodes.

### 4. Zone Textures Load Slowly
The three zone texture SVGs are large external files (up to 5000px) loaded via `<image href=...>`. They're the last things to appear.

**Fix:** Replace all three texture SVG imports with inline SVG elements (radial gradients + simple patterns):
- **Core zone**: Lush green radial gradient (darker at edges, lighter center)
- **Middle zone**: Light green land fill with subtle noise pattern
- **Outer/Fringe zone**: Desert/savanna warm sandy gradient
- **Inactive zone**: Keep current light fill

This eliminates 3 network requests and renders instantly.

### 5. White Background Rectangle
`CityRenderer.tsx` line 117: `<rect fill="hsl(40, 25%, 94%)" />` draws a light sandy background that doesn't match the site's dark background.

**Fix:** Change to `fill="transparent"` so the graph sits cleanly on the dark page background.

### 6. Inactive Zone Boundary Line Color
Currently uses grey (`hsl(0, 0%, 50%)`). 

**Fix:** Change to a dusty terracotta/sand color like `hsl(30, 40%, 55%)` with slightly higher opacity -- suggesting a faded desert boundary that fits the savanna-to-wasteland transition.

### 7. Outer Boundary Circle
The dashed circle around the entire graph uses grey on a dark background and won't be visible.

**Fix:** Change to a subtle warm sand color (`hsl(35, 30%, 45%)`) so it's visible against the dark site background.

## Technical Details

**Files to modify:**
- `src/themes/city/CityNode.tsx` -- swap building-1/3 to building-2, add inline tent SVG, replace animate-ping with custom pulse, add custom CSS keyframe
- `src/themes/city/CityZones.tsx` -- replace texture image imports with inline SVG gradients/patterns, update boundary line colors
- `src/themes/city/CityRenderer.tsx` -- change background rect to transparent
- `src/components/graph/OpinionGraph.tsx` -- prevent mock data flash during loading
- `src/index.css` -- add custom keyframe for gentle ring pulse

**Files no longer needed (can keep but won't be imported):**
- `src/assets/city/textures/zone-core.svg`
- `src/assets/city/textures/zone-middle.svg`
- `src/assets/city/textures/zone-outer.svg`

