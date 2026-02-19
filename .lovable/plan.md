
# New Theme: "Signal & Noise"

## Overview

Create a fourth theme called `signal` that uses inline SVG shapes for nodes (no sprite sheets, no external assets) and a CSS radial gradient for zones. This is the lightest-weight theme yet -- zero asset files, pure code.

## Sprite Sheet Code

The existing Arcane sprite sheet code (`src/assets/arcane/`, `ArcaneNode.tsx` with its sprite imports) stays untouched. It's isolated to the Arcane theme and doesn't affect anything else. No cleanup needed.

## New Files

| File | Purpose |
|------|---------|
| `src/themes/signal/SignalNode.tsx` | Inline SVG node shapes per zone |
| `src/themes/signal/SignalZones.tsx` | CSS-based radial gradient circle |
| `src/themes/signal/SignalEdge.tsx` | Edge renderer (glowing lines) |
| `src/themes/signal/SignalEventMarker.tsx` | Event marker (pulse effect) |
| `src/themes/signal/SignalRenderer.tsx` | Main renderer (same pattern as City/Arcane) |

## Modified Files

| File | Change |
|------|--------|
| `src/themes/types.ts` | Add `'signal'` to `ThemeName` union |
| `src/themes/ThemeContext.tsx` | Handle `'signal'` value |
| `src/components/admin/ThemePanel.tsx` | Add `{ value: 'signal', label: '📡 Signal & Noise' }` |
| `src/components/graph/OpinionGraph.tsx` | Add `SignalRenderer` branch alongside city/arcane |

## Node Designs (Inline SVG)

All nodes are 40x40 viewBox, rendered inline -- no external files.

**Core (Star/Compass):**
- Outer ring: `circle r=15, stroke #E0FFFF`
- Inner star: 8-point path in `#E0FFFF`

**Middle (Stable Signal):**
- Outer ring: `circle r=12, stroke #00D4FF, stroke-width 2`
- Inner dot: `circle r=6, fill #00D4FF`

**Outer (Glitch):**
- Two offset red squares: `rect fill #FF3B3B` (one at 60% opacity)
- Crosshair dashed lines

**Inactive (Dormant Shell):**
- Dashed circle: `stroke #32394E, stroke-dasharray 4 2`
- Tiny center dot: `fill #32394E`

## Zone Design (CSS Radial Gradient)

Instead of SVG circles, the zones use an HTML `div` with a CSS radial gradient overlaid on the SVG via `foreignObject`:

```text
radial-gradient(
  circle,
  rgba(255,255,255,0.15) 0%,      -- Center glow
  rgba(11,14,26,1) 20%,            -- Gap
  rgba(0,212,255,0.05) 21%,        -- Middle zone tint
  rgba(11,14,26,1) 50%,            -- Gap
  rgba(255,59,59,0.05) 51%,        -- Outer zone tint
  rgba(11,14,26,1) 85%,            -- Gap
  rgba(50,57,78,1) 90%,            -- Inactive ring
  rgba(11,14,26,1) 91%             -- Edge
)
```

This is rendered as an SVG `foreignObject` containing a `div` with `border-radius: 50%` and the gradient, so it integrates seamlessly into the SVG canvas used by all renderers.

## Edge Design

Thin glowing lines using `#00D4FF` for active/accepted edges and `#FF3B3B` for pending edges, with a subtle glow filter. Matches the signal aesthetic.

## Technical Notes

- `SignalRenderer` follows the exact same pattern as `ArcaneRenderer` / `CityRenderer` -- reuses the shared tokenizer, same props interface
- Zero external assets = fastest loading theme
- The dark background (`#0B0E1A`) of the gradient naturally provides the theme's mood
- Speech bubbles, YOU flag, Online badge, unread badge, and incoming request pulse all reuse the same pattern from existing themes, restyled with the Signal & Noise color palette (`#00D4FF` cyan, `#FF3B3B` red, `#E0FFFF` light cyan, `#32394E` muted blue-gray)
