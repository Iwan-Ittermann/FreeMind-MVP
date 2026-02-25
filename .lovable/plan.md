# Signal & Noise Theme — Visual Clarity Improvements

The current theme is functional but hard to parse at a glance. The dark monochrome palette, subtle zone gradients, and uniform cyan coloring make it difficult to distinguish zones, node types, and relationships. Here are purely visual changes (no logic touched).

---

## 1. Zone-Differentiated Color Coding

**Problem:** All zones use nearly the same dark background with barely-visible tint differences. Users can't tell where "core" ends and "middle" begins without reading the tiny numbered labels.

**Fix (SignalZones.tsx):**

- Give each zone a more distinct background tint in the radial gradient:
  - Core: warmer white/gold tint (`rgba(255, 220, 140, 0.10)`)
  - Middle: existing cyan tint but stronger (`rgba(0, 229, 255, 0.08)`)
  - Outer: reddish tint, stronger (`rgba(180, 40, 40, 0.10)`)
  - Inactive: keep near-black
- Make the dashed ring boundaries slightly more visible (strokeOpacity 0.15 → 0.30)
  &nbsp;

## 2. Node Shapes with Zone-Matched Colors

**Problem:** Core nodes are white, middle nodes are cyan, outer nodes are a tiny dark-red square, inactive are gray — the shapes are distinctive but the color mapping doesn't help users build a mental model.

**Fix (SignalNode.tsx):**

- Core nodes: keep white star/diamond, add a subtle warm gold glow filter instead of plain white glow
- Middle nodes: keep cyan circles, no change needed (already clear)
- Outer nodes: change from a plain dark-red square to a slightly larger square with a visible red border and dim red fill, so it reads as "warning/distant"
- Inactive nodes: make the dashed circle slightly brighter (`#4A5168` instead of `#32394E`) so they're visible against the near-black inactive zone



---

## Files to Edit


| File                                | Change                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `src/themes/signal/SignalZones.tsx` | Stronger zone tints, brighter ring strokes, replace number labels with zone names |
| `src/themes/signal/SignalNode.tsx`  | Gold glow for core, brighter inactive, diamond shape for outer                    |
| `src/themes/signal/SignalEdge.tsx`  | &nbsp;                                                                            |


No logic, data flow, layout algorithm, or component structure changes.