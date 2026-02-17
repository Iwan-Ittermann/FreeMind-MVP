
# Arcane Theme — Sprite Sheet Integration

## Overview

Add a new "Arcane" theme that uses the uploaded SVG sprite sheets (9 buildings per file, 3x3 grid on 1024x1024 canvas). Instead of extracting individual SVGs, we render each building by referencing the sprite sheet with SVG `viewBox` cropping. The circle texture file will be assessed for performance and either used directly or replaced with a CSS/SVG gradient approximation.

## Sprite Sheet Approach

Each uploaded file is a 1024x1024 SVG with 9 buildings arranged in a 3x3 grid. Each cell is approximately 341x341 pixels. To render a single building, we use an `<image>` tag with a clip/viewBox trick:

- Building 1 (top-left): crop to `(0, 0, 341, 341)`
- Building 2 (top-center): crop to `(341, 0, 341, 341)`
- Building 3 (top-right): crop to `(682, 0, 341, 341)`
- ...and so on for all 9 positions

This is implemented by wrapping each `<image>` in a `<svg>` element with the appropriate `viewBox` offset, keeping the sprite sheet as a single imported asset.

## File Size Analysis

| File | Lines | Estimated Size |
|------|-------|---------------|
| Core zone nodes | 6,941 | ~250KB |
| Middle zone nodes | 8,065 | ~300KB |
| Outer zone nodes | 8,792 | ~330KB |
| Inactive nodes | 6,558 | ~240KB |
| Circle texture | 6,028 | ~220KB |

Total: ~1.3MB for all assets. Since only one theme is active at a time and Vite handles lazy imports, this is acceptable. The texture file (circle_texture.svg) is the largest concern -- if it's used as a repeating background, we'll create a simplified CSS radial gradient that mimics its appearance instead of loading the full 220KB SVG.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/arcane/nodes/core.svg` | Copy from upload (sprite sheet) |
| `src/assets/arcane/nodes/middle.svg` | Copy from upload (sprite sheet) |
| `src/assets/arcane/nodes/outer.svg` | Copy from upload (sprite sheet) |
| `src/assets/arcane/nodes/inactive.svg` | Copy from upload (sprite sheet) |
| `src/assets/arcane/textures/circle-texture.svg` | Copy from upload (for reference), but use CSS gradient |
| `src/themes/arcane/ArcaneNode.tsx` | New -- renders nodes via sprite sheet cropping |
| `src/themes/arcane/ArcaneZones.tsx` | New -- zone rings styled in arcane palette |
| `src/themes/arcane/ArcaneEdge.tsx` | New -- edge renderer |
| `src/themes/arcane/ArcaneRenderer.tsx` | New -- main renderer (mirrors CityRenderer) |
| `src/themes/arcane/ArcaneEventMarker.tsx` | New -- event marker |
| `src/themes/types.ts` | Add `'arcane'` to `ThemeName` |
| `src/themes/ThemeContext.tsx` | Handle `'arcane'` value |
| `src/components/admin/ThemePanel.tsx` | Add Arcane option to dropdown |
| `src/components/graph/OpinionGraph.tsx` | Add arcane renderer branch |

## Technical Details

### ArcaneNode Component

The key innovation: instead of importing 9 individual SVGs, we import one sprite sheet per zone and use SVG viewBox cropping:

```text
// Pseudo-code for sprite rendering
const GRID_SIZE = 341; // 1024 / 3
const col = index % 3;
const row = Math.floor(index / 3);

<svg viewBox={`${col * GRID_SIZE} ${row * GRID_SIZE} ${GRID_SIZE} ${GRID_SIZE}`}
     width={NODE_SIZE} height={NODE_SIZE}>
  <image href={spriteSheet} width={1024} height={1024} />
</svg>
```

Each node gets a building index (0-8) based on a hash of its ID, then renders the corresponding grid cell from the appropriate zone's sprite sheet.

### ArcaneZones Component

Instead of loading the large circle texture SVG (~220KB), create an arcane-themed zone gradient inline:
- Colors sampled from the texture file (olive/khaki tones: `#777558` base)
- Radial gradients with grain-like noise via SVG `<feTurbulence>` (lightweight, no external asset)

### Theme Registration

- Add `'arcane'` to the `ThemeName` union type
- Add detection in `ThemeContext.tsx` for the `'arcane'` value
- Add `{ value: 'arcane', label: 'Arcane' }` to the admin ThemePanel dropdown
- Add conditional branch in `OpinionGraph.tsx` similar to the existing city theme branch

## Performance Considerations

- Sprite sheets are imported once and reused across all nodes in that zone
- No individual file extraction = fewer HTTP requests
- The texture background uses inline SVG gradients (same pattern as the existing city theme) instead of loading the large SVG file
- Vite will bundle only the active theme's assets
