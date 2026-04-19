

## Plan: Fix Competing Backgrounds + Black Edge Bleed

### What's broken (visible in screenshot)

1. **Two backgrounds stacked**: 
   - Outer: `TTBackground` (the iris/eye SVG) — correct, what we want.
   - Inner (the ugly off-center dark blob with orange tint): the **Signal theme's `SignalZones`** rendered inside `OpinionGraph`. It draws its own dark anthracite core + warm/cool atmospheric glows extending to `1.4×` the graph radius. This is a full second background and it competes with the iris.
2. **Off-center placement**: The Signal dark glow LOOKS off-center because the parallax `y: 12% → -12%` translates the entire graph layer at initial scroll position — combined with the giant `1.4×` glow extending beyond the graph circle, it bleeds into the upper area and covers the freemind logo + door icon.
3. **"Black rounded edges"**: That's the Signal `signal-glow-warm/cool` radial gradients (which fade to dark) leaking out of the graph footprint, plus the parallax offset moving them into the header zone. The actual viewport wrapper isn't rounded — the dark blob just *appears* edge-rounded.

### Fix strategy

**A. Use a "naked" graph variant for TT mode** — no Signal zones, no glows, no level rings. Only nodes + edges + (optionally) the discrete level rings as faint guides. The iris SVG already provides the zones visually.

Implementation:
- Add a new `theme` option `'naked'` to `OpinionGraph` (or a `chrome={false}` prop) that renders nodes/edges directly on a transparent SVG — skipping `SignalZones`, `ConcentricCircles`, all backdrops.
- In `TTScreen`, pass that prop. The iris background remains the only zone visualization.

**B. Reduce parallax aggressiveness + center math**
- Drop translate range from `12% → -12%` to `4% → -4%`. Subtle depth, no bleed.
- Confirm the graph wrapper is centered (`flex items-center justify-center`) — already is, but parallax was the visual offset cause.

**C. Trim the eye background's outer reach**
- The iris SVG fills the whole 480px section with the cream/blue outer ring. On a 390×844 viewport with `preserveAspectRatio="xMidYMid slice"`, the outer ring gets cropped at top/bottom — fine. Make sure `TTScreen`'s `bg-black` doesn't show as visible black corners by extending the iris with a matching cream/dark fallback color on the section (use a CSS background-color matching the outer iris stop, e.g. `#eef2f4`, instead of `bg-black`).

**D. Header readability**
- Add a subtle top fade (`bg-gradient-to-b from-background/60 to-transparent h-20`) behind the header so the wordmark and exit/bell icons stay readable regardless of what's behind.

### Files to change

| File | Change |
|---|---|
| `src/components/graph/OpinionGraph.tsx` | Add `chrome?: 'full' \| 'naked'` prop. When `'naked'` and theme is signal, skip `SignalZones`. |
| `src/themes/signal/SignalRenderer.tsx` | Accept `showZones?: boolean` (default true); if false, omit `<SignalZones />`. |
| `src/components/tt/TTScreen.tsx` | Pass `chrome="naked"` to `OpinionGraph`; reduce parallax to ±4%; change section bg to iris-matching color. |
| `src/components/tt/TTHeader.tsx` | Add subtle top gradient backdrop for readability. |

### Out of scope
- Restructuring zone naming / radius logic.
- Any other theme.

