

## Plan: TT radii, colors, sizes, label positions

### 1. New 10-level radial mapping (TT only)

Background landmarks (in viewport pixels, relative to graph center):
- Dark core radius `Rcore = 23.33vw`
- Blue ring outer `Rblue = 50vw`
- White ring outer `Rwhite = 60vw`

Convert to graph-internal coords by passing the section's CSS-px landmarks to the graph as part of `LayoutConfig`. Strategy: compute landmarks in `TTScreen.tsx` from the actual viewport width (using a `useEffect` + window resize listener, plus the wrapper's measured `size`), then pass them into a new TT-specific layout function instead of re-using `calculateLayout`.

**Discrete level → radius (TT)**

| Level | Score range | Position |
|---|---|---|
| 10 | ≥ 2500 | Exact center (R=0). Multiple level-10 nodes arrange on a tight inner circle. |
| 9  | 1750–2499 | Inside dark core, ~75% of `Rcore` |
| 8  | 1250–1749 | Inside dark core, ~50% of `Rcore` |
| 7  | 1000–1249 | Just inside dark core border, ~25% of `Rcore` |
| 6  | 750–999  | Inside blue ring near dark core border (`Rcore + 12% × (Rblue − Rcore)`) |
| 5  | 500–749  | `Rcore + 30% × (Rblue − Rcore)` |
| 4  | 250–499  | `Rcore + 50% × (Rblue − Rcore)` |
| 3  | 50–249  | `Rcore + 70% × (Rblue − Rcore)` |
| 2  | 10–49   | `Rcore + 88% × (Rblue − Rcore)` ← **starter ring (10 pts) sits slightly inside blue ring** |
| 1  | 0       | `Rblue − tinyPad` (very outer edge of blue ring) |
| Extreme A | −1 to −1000 | `Rwhite + 4px` (just outside white ring) |
| Extreme B | −1001 to −2500 | `Rwhite + 4px + step` |
| Extreme C | < −2500 | `Rwhite + 4px + 2×step` |

`step ≈ 18px` (one node-diameter spacing) — adjusted so even the outer extreme ring stays within section bounds for a 390×844 viewport.

**No node ever sits in the white-ring band** (`Rblue → Rwhite`).

Newly added nodes (no chats yet) get **10 starter points** → land on Level 2 ring (slightly inside blue ring), per user choice.

### 2. Per-zone node styling (TT only)

The graph uses the Signal renderer in TT. We add TT-specific styling via a new `ttMode` flag (or by zone re-tagging in tokenizer). Easier: pass `ttMode` down to `SignalRenderer` and `SignalNode`, and have the node component override colors/size when active.

| Zone | Color | Size |
|---|---|---|
| `core` (inside dark center, levels 7–10) | Gold `#F5C542` (replaces cyan star, keep star shape) | Standard |
| `middle` (blue ring, levels 1–6) | Emerald green `#10B981` (replaces existing green circle) | Standard |
| `outer` (extreme, outside white ring) | Black `#0a0a0a` | **Smaller** (`scale × 0.6`) |
| Bot | Unchanged (purple AI badge) | Unchanged |

Re-zoning uses score thresholds: `>1000 → core (gold)`, `0–1000 → middle (green)`, `<0 → outer (black, small)`. Zone tagging happens in the tokenizer when a `ttMode` flag is on, or in the new TT layout function via the `zone` field on `GraphNode`.

### 3. Label repositioning in `TTScreen.tsx`

Labels use viewport-relative positions to align with background landmarks:

- **Respektvoll** — keep at center (current).
- **Moderat** — inside the blue ring (between dark core and blue-ring outer). Position: `top: calc(50% - 35vw)` (≈ midway between `Rcore=23vw` and `Rblue=50vw` from center, above center). Centered horizontally.
- **Extrem** — outside the white ring. Position: `top: calc(50% + 62vw)` (just below `Rwhite=60vw`). Centered horizontally.

All three centered on the X axis, stacked vertically: Respectful (center) → Moderate (above, in blue ring) → Extreme (below, outside white ring). Per user request: "Moderate below Respectful, Extreme below both" — interpreted as Z-stack from inside-out, not strict vertical order. Labels use `position: absolute; left: 50%; transform: translateX(-50%)` and `top` values relative to section center.

### 4. Implementation files

| File | Change |
|---|---|
| `src/lib/tt-layout.ts` (new) | TT-specific layout: takes opinions, ratings, viewport-derived `Rcore/Rblue/Rwhite`, returns `GraphData` with the new level→radius mapping and zone tagging. Reuses existing angle calc + collision resolution. |
| `src/components/tt/TTScreen.tsx` | Measure viewport width on mount/resize, compute `Rcore/Rblue/Rwhite` in graph-SVG coords (ratio = viewport-px ÷ wrapper-size × graph-internal-radius). Pass new `ttMode={true}` and landmark radii to `OpinionGraph`. Reposition the three zone labels per spec above. |
| `src/components/graph/OpinionGraph.tsx` | Accept `ttMode?: boolean` and optional `ttLandmarks?: { coreR, blueR, whiteR }`. When set, use `tt-layout.ts` instead of `calculateLayout`. Forward `ttMode` to renderer. |
| `src/themes/signal/SignalRenderer.tsx` | Accept and forward `ttMode` to `SignalNode`. |
| `src/themes/signal/SignalNode.tsx` | When `ttMode`: render gold star for core, emerald circle for middle, small black square for outer. Use `scale × 0.6` for outer nodes. |
| `src/lib/freemind-layout.ts` | Untouched (other routes keep current behavior). |

### 5. Out of scope

- Animating nodes between old and new positions on initial load.
- Changing the bot's color (stays purple).
- Per-topic hue rotation affecting node colors.
- Wide-viewport (desktop) re-tuning of the TT view.

