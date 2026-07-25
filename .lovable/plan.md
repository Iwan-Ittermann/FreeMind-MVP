## What's wrong

**1. Chat/opinion sidebar still overflows the phone frame**

`TTSideTabs` sits inside the phone-viewport (max 480px wide), but the panels are absolute-positioned with `left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[360px]`. On the current 393 px mobile viewport that math is fine on paper (panel = 360, side gutter ≈ 16 px each), yet the user still sees it clipped. The most likely cause is that `TTSideTabs` is rendered as a React fragment (buttons + AnimatePresence). Because it isn't wrapped in a positioned container that fills the phone-viewport, the two rendered panels resolve their `left-1/2` against whichever positioned ancestor `AnimatePresence` ends up under — in this layout that's still the phone-viewport, but the panel's own width via `w-[calc(100%-2rem)]` uses the phone-viewport's full width, which on some devices (safe-area insets, notch, iOS 100dvh differences) resolves wider than the visible frame.

Fix: wrap the AnimatePresence children in a single `absolute inset-0 pointer-events-none` container that is the panel's offset parent, and switch the panels from `left-1/2 / -translate-x-1/2 / w-[calc(100%-2rem)]` to `left-4 right-4 mx-auto max-w-[360px]`. That guarantees the panel is bounded by the frame's left/right edges regardless of translate rounding or safe-area math. Same treatment for the backdrop.

**2. Outer-ring nodes are half-clipped**

Graph SVG wrapper is `min(85%, 480px)` of the phone-viewport, but `ttLandmarks` uses the phone-viewport width directly:

```text
blueR = (300/600) × phoneViewportW = phoneViewportW / 2
```

A node placed at `r = blueR − 4` sits at ~viewportW/2 from the graph center, which is the phone-frame's edge. With the node's visual radius (~13 px) the node extends past the frame → half visible.

Fix: reserve a fixed node margin inside the visible ring.
- Define `nodeSafePad = 16` (roughly node radius + a couple px).
- Cap every positive-tier radius by `blueR − nodeSafePad` instead of `blueR − 4`, both for level 1 (starter) and for the top of the moderate band.
- Also cap the existing extreme-band `extremeOuter` at `blueR − nodeSafePad` (currently `blueR − 18`, keep the tighter of the two).

The background rings stay put — only the maximum radius that nodes are allowed to occupy shrinks. Layout stays deterministic (pure function of totals + id).

## Files to change

- `src/components/tt/TTSideTabs.tsx` — wrap panels in a bounded offset parent; switch panels to `left-4 right-4 mx-auto max-w-[360px]`; do the same for the backdrop so its click target matches.
- `src/lib/tt-layout.ts` — introduce `nodeSafePad` and clamp level 1 (starter/`blueR - tinyPad`) and the outer moderate radii to `blueR − nodeSafePad`. Update `extremeOuter` to `Math.min(blueR - 18, blueR - nodeSafePad)`.

## Verification (in build mode)

Drive Playwright at `http://localhost:8080/7mm9` at 393 × 852, screenshot:
1. Idle graph — confirm the outermost node's right edge is inside the phone-frame with visible padding.
2. Tap the "Chats" pill, screenshot — confirm the panel's left/right edges sit inside the frame with a visible gutter.

No changes to routing, data, chat logic, or theme.