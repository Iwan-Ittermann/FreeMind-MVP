## Goal

Make the top chrome (thin header bar + topic-title area) render at a **stable, predictable height** so it no longer grows or shrinks with viewport height, DPR quirks, or title line-wrap count.

## Root cause

In `src/components/tt/TTHeader.tsx`:

1. The topic-title container uses viewport-relative anchoring:
   ```
   top: 32
   bottom: calc(50% + min(42.5vw, 204px) + 14px)
   ```
   Its height = `viewportHeight/2 − graphRadius − 46`. On tall frames this becomes huge; on short frames it collapses. That is the "sometimes thin, sometimes wide" band.
2. A separate `h-12` gradient overlay adds a translucent whitish band on top of whatever the title block is doing, amplifying the effect.
3. The title `h1` uses `clamp()` font-size + free wrapping, so 1-line vs 2-line titles further vary the visible height.

## Fix

Change the top chrome to a **fixed-height stack** and let the graph sit below it deterministically.

### 1. Fixed header stack in `TTHeader.tsx`
- Replace the absolute-anchored title container with a fixed-height block placed directly under the slim header row:
  - Slim bar: keep ~28px, unchanged.
  - Title block: fixed height (e.g. `h-16` = 64px) with `flex items-center justify-center` and `line-clamp-2` on the `h1` so wrapping never exceeds 2 lines.
- Total top chrome: **~92px**, exposed as a CSS custom property `--tt-top-chrome: 92px` on the phone-frame root.
- Remove the `h-12` gradient overlay (or shrink it to sit *inside* the title block, not over the graph).

### 2. Anchor graph off the fixed chrome
- In `TTScreen.tsx` / `TTBackground.tsx`, position the graph relative to `--tt-top-chrome` instead of `50%` of the frame. Simplest: wrap the graph area in a container with `top: var(--tt-top-chrome); bottom: var(--tt-bottom-chrome)` and center the SVG within it. Keeps the graph deterministic and stops the title band from "stealing" space.

### 3. Keep title readable
- `line-clamp-2` + `text-ellipsis` on the h1. Font-size clamp stays but with a tighter range (e.g. `clamp(0.95rem, 3.6vw, 1.2rem)`) so the two-line box is guaranteed to fit within 64px.

## Files touched

- `src/components/tt/TTHeader.tsx` — replace anchored title with fixed-height block; drop the gradient overlay.
- `src/components/tt/TTScreen.tsx` — expose `--tt-top-chrome`; position graph container below it.
- `src/components/tt/TTBackground.tsx` — if it currently uses `50%` centering, switch to centering within the graph container (no functional change to visuals).
- Verify: `TTCenterCTA`, `TTSideTabs`, `TTHelpOverlay` still align (they anchor to `bottom`, so unaffected).

## Verification

- Playwright screenshots at 393×640, 393×852, 393×932 and 480×900: top chrome height must be identical (~92px) across all three; graph fully visible; title never overflows or overlaps the graph ring.
