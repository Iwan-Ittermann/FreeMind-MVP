## Problem

Users can't reliably submit an opinion because the center CTA seems to vanish on its own:

1. `EineWocheEineFrage.tsx` renders `<TTCenterCTA />` only when `!selectedNode`. Tapping any graph node — the first thing a new visitor does — unmounts the CTA. Tapping empty space brings it back. This is the "appears and disappears" the user is reporting.
2. `TTCenterCTA`'s outside-click handler collapses the pill from its default `half` state (labeled "Deine Meinung teilen…") down to a bare `+` icon on any mousedown outside the pill (graph nodes, zone labels, sidebar buttons, backdrop). Users then don't recognize it as the opinion CTA and need two more taps to reopen the composer.

## Fix (presentation only)

### 1. Keep the CTA mounted while the user still has no opinion
File: `src/pages/EineWocheEineFrage.tsx`

- Change the render gate from
  `{ownOpinionKnown && !hasOwnOpinion && !selectedNode && <TTCenterCTA … />}`
  to
  `{ownOpinionKnown && !hasOwnOpinion && <TTCenterCTA … />}`.
- The opinion panel (`TTBottomPanel`) already coexists with the CTA visually — no z-index or layout changes required.

### 2. Make `half` the resting state; don't collapse to `+`
File: `src/components/tt/TTCenterCTA.tsx`

- Outside-click behaviour:
  - If `state === 'full'` and the click is outside the wrapper → set state to `half` (not `collapsed`).
  - If `state === 'half'` → do nothing. The labeled pill stays visible and always tappable.
- Remove the `collapsed` branch from the outside-click handler entirely (the `Minus` button inside `full` remains the explicit "minimize" path, and we can drop the `collapsed` visual state or keep it only as a manual minimize target — for this fix, simplest is to keep `collapsed` reachable only via the `Minus` button, and default to `half` on mount).
- Keep `handleClick`: `collapsed → half`, `half → full`. First tap on the labeled pill still opens the composer immediately.
- Continue ignoring events whose target sits inside `[role="dialog"]` (Radix portals for the verification dialog / toasts).

### 3. Small robustness tweaks in the same handler
File: `src/components/tt/TTCenterCTA.tsx`

- Switch the listener from `mousedown` to `pointerdown` so touch and mouse behave identically.
- Early-return when `wrapperRef.current` is `null` (StrictMode double-mount safety).

## Out of scope

- No RPC, i18n, routing, or auth changes.
- No layout move — the CTA keeps its current position under the graph.
- Positioning tour, help overlay, and side tabs are untouched.

## Verification

- On `/` (single-topic build) as a signed-in user without an opinion:
  - Load page → labeled pill visible.
  - Tap a graph node → opinion panel opens AND the labeled pill remains visible.
  - Tap outside the pill (backdrop, node, zone label) → pill stays in `half` state (no shrink to `+`).
  - Tap the pill → composer expands to `full`.
  - Tap outside while `full` → collapses back to `half`, not to `+`.
  - Submit an opinion → CTA disappears (unchanged behaviour, gated by `hasOwnOpinion`).
