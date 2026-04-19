

## Plan: Swap TT background to new SVG, sized so blue ring fits screen width

### What changes

Replace the current `TTBackground` artwork with the user's uploaded SVG (cream/blue gradient + grain, white ring r=360, blurred teal circle r=300, dark core r=140). Keep the same component API (`hue`, `className`).

### Sizing requirement

"Outer borders of the blue ring touch left and right of the screen."
- Blue ring radius = 300 in a 1000×1000 viewBox → diameter 600, i.e. **60% of the SVG width**.
- For diameter to equal `100vw`, the SVG must be rendered at **width = 100vw / 0.6 ≈ 166.67vw**, square (same height).
- Center it so the blue circle sits at the screen center. Vertically the SVG overflows top/bottom — that's intended (white ring + grain get cropped).

### Implementation

**1. `src/components/tt/TTBackground.tsx`** — rewrite contents:
- Inline the new SVG markup (gradients, grain filter, blur filter, four circles).
- Remove the old iris layers + masks (no longer needed).
- Render the SVG inside a positioned wrapper:
  ```tsx
  <div style={{
    position: 'absolute',
    left: '50%', top: '50%',
    width: 'calc(100vw / 0.6)',
    height: 'calc(100vw / 0.6)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  }}>
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {/* new artwork */}
    </svg>
  </div>
  ```
- Keep `hue` prop applied via `filter: hue-rotate(...)` for topic differentiation.

**2. `src/components/tt/TTScreen.tsx`** — adjust how the background is mounted:
- Currently `TTBackground` lives inside the small square wrapper (`min(85vmin, 480px)`) clipped by `rounded-full overflow-hidden`. That has to change because the new background must be sized to **viewport width**, not the graph wrapper.
- Move `<TTBackground>` out of the inner square wrapper and place it as a direct child of the section, absolutely positioned to fill the section. Remove the `rounded-full overflow-hidden` clip — the new SVG is intentionally a soft-edged painting that bleeds beyond the graph footprint.
- Keep the graph wrapper exactly as-is (centered, sized to `min(85vmin, 480px)`) so the graph layout doesn't change. The graph's center will still align with the dark core because both are centered on the section.
- Section background color stays `#eef2f4` as a fallback for the cropped vertical edges (matches the cream gradient stop).

**3. No other files affected.**
- `OpinionGraph` keeps `chrome="naked"`.
- Zone labels stay where they are.
- i18n unchanged.

### Edge cases

- **Tall viewports (e.g. 390×844)**: `100vw/0.6 = 650px` SVG on a 390-wide screen. Blue ring spans full width, dark core is well within the graph footprint. White ring + grain crop top/bottom — desired.
- **Wide viewports**: Same rule still holds; the SVG follows viewport width. On very wide screens the background gets larger but stays centered. Acceptable for a mobile-first surface; if it ever runs on tablet landscape we can cap with `min(166vw, 1200px)` later — out of scope now.
- **Hue rotation per topic**: still works via CSS filter on the wrapper.

### Out of scope
- Changing the graph itself.
- Different per-topic palettes (only hue rotation as today).
- Capping max background size for ultrawide screens.

