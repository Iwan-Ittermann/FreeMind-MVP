# Plan: Center CTA + Zone/Snap/Node polish

## 1. Subtler zone labels & repositioning (`src/components/tt/TTScreen.tsx`)

Make all three labels low-key and place them at zone *boundaries* (not the dead center), keeping the circular metaphor.

- Drop the background chip (`bg-background/55 backdrop-blur-sm`) and reduce contrast: `text-foreground/45`, `font-normal`, keep `text-[10px] tracking-[0.25em] uppercase`.
- Reposition (all `left-1/2 -translate-x-1/2`):
  - **Extrem** → just outside the white ring (top): `top: 50% - phoneViewportW * 0.62`.
  - **Moderat** → between white and blue ring: `top: 50% - phoneViewportW * 0.42`.
  - **Respektvoll** → at the inner edge of the blue ring (just above the dark core), no longer dead center: `top: 50% - phoneViewportW * 0.235` (≈ coreR boundary).

## 2. Central pill CTA with 3 states (new component + wiring)

The current bottom add-opinion form moves into a centered "ring CTA". Three states with framer-motion transitions:

- **collapsed** — circle (`+` icon only, ~52px).
- **half-expanded** (default) — pill, single line, placeholder = "Was ist deine Meinung?" (translated). Click anywhere outside → collapses.
- **fully-expanded** — multi-line textarea (~150px tall), placeholder = the topic title, with a minimize chevron button (top-right) and POSTEN send button (bottom-right). Click outside (and text empty) → returns to half-expanded; clicking the minimize icon → collapsed.

Implementation:
- New component `src/components/tt/TTCenterCTA.tsx` containing the state machine + animations + supabase `submit_opinion` call (logic moved from `TTBottomPanel`'s add-opinion branch, including the 1st/4th/10th browser-notification gating).
- Positioned absolutely in `TT.tsx` centered on the graph (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, z-index above zones, below tour overlay). Hidden when an opinion node is selected (the selected-opinion panel still uses bottom-of-screen position) and hidden when user already has an own opinion.
- Global `mousedown`/`pointerdown` listener: any click outside the CTA → collapse (animated). Tapping the CTA in collapsed/half states → half/full respectively.
- `TTBottomPanel` loses its add-opinion form; it keeps only the selected-opinion panel + report dialog. The `forceShowAddOpinionForm` and `highlightAddOpinionForm` tour props get re-routed to the new center CTA (passed through from `TT.tsx`).

States diagram:
```text
       tap                tap
collapsed ──▶ half-exp ──▶ full-exp
   ▲           │            │
   └───────────┴── click-outside ──┘
                              minimize-icon
```

## 3. Harden vertical snap (avoid half/half display) (`src/pages/TT.tsx`)

- Add `scroll-snap-stop: always` to each section style (`snap-always` is set, but reaffirm via inline style for older WebKit).
- Add a `resize` + `visibilitychange` listener that re-runs `jumpToRealTopic(activeTopicId)` (only when no scroll-in-progress) so window resizes / devtools toggles don't leave the viewport between two topics.
- Add a small "snap-correction" effect: after the IntersectionObserver picks a new active topic, schedule one `requestAnimationFrame` `scrollIntoView({ block: 'start' })` to lock alignment.
- Set `scrollSnapStop: 'always'` in the inline scroll-container style.

## 4. Center the "YOU" text in the red node (`src/themes/signal/SignalNode.tsx`)

The star path is symmetric around (20,20) but the current text uses `y="20.5"` with `dominantBaseline="central"`, which biases low. Switch to `y="20"` and add `style={{ dominantBaseline: 'central' }}`. Slightly raise font to 8 with `letterSpacing="-0.3"` so it visually sits in the star's body. Verify visually after.

## Files touched
- `src/components/tt/TTScreen.tsx` — subtler & repositioned zone labels.
- `src/components/tt/TTCenterCTA.tsx` — **new** 3-state pill CTA.
- `src/components/tt/TTBottomPanel.tsx` — remove add-opinion branch; keep selected panel only.
- `src/pages/TT.tsx` — render `TTCenterCTA`, snap hardening, prop wiring.
- `src/themes/signal/SignalNode.tsx` — center YOU label.
- `src/i18n/locales/{en,de}.json` — strings: `tt.centerCTAPlaceholderShort`, `tt.minimize`.
