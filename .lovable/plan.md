

## Plan: Fix Inline CTA, Edge Visibility, and Landing Page Graphs

### 1. Inline CTA Not Working (Can't Type)

**Root cause**: The graph SVG uses `overflow-visible` and the parent `motion.div` overlaps the textarea below it. The SVG's transparent `<rect>` with an `onClick` handler intercepts pointer events over the textarea area.

**Fix** (`src/pages/Index.tsx`): Add `relative z-10` to the inline CTA container (line 465) so it sits above the graph's overflow. This ensures the textarea receives focus and input events.

### 2. Non-Connected Edges Showing on Hover

**Root cause**: In `SignalRenderer.tsx` line 114, when `highlightedNode` is set, the entire edges group gets `opacity: 1`. The `isDimmed` prop in `SignalEdge` only reduces opacity to `0.08` — still visible.

**Fix** (`src/themes/signal/SignalEdge.tsx`): Change the `isDimmed` opacity from `0.08` to `0`, so only edges connected to the highlighted node are visible. This matches the documented behavior: "edges are only displayed when a node is hovered, showing only the connections for that specific node."

### 3. Landing Page Graphs → Signal & Noise Style

**Current**: The `DiscourseGraph` component uses a light-mode style with green/orange/red fill colors and grey strokes on a transparent background.

**Fix** (`src/pages/Landing.tsx`): Redesign the `DiscourseGraph` component to match the Signal & Noise theme:
- Dark charcoal background (`#1A1A2E`)
- Concentric level rings with faint cyan/green/orange strokes
- Node colors: cyan (`#00e5ff`) for core/respectful, green (`#14B866`) for moderate, orange for extreme
- Edge color: faint cyan (`#00D4FF`) lines
- Subtle radial glow effects
- Zone labels in white (Respectful, Moderate, Extreme) — optional, may be too small

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `relative z-10` to inline CTA wrapper |
| `src/themes/signal/SignalEdge.tsx` | Set `isDimmed` opacity to `0` |
| `src/pages/Landing.tsx` | Redesign `DiscourseGraph` to Signal & Noise dark theme |

