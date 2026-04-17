

## Plan: Positioning Tour Fixes + Thumb Rating Visual

### Issue 1: Next button below the panel (desktop)

**Root cause**: The opinion panel uses `lg:absolute` (positioned inside the centered graph wrapper), while `PositioningTourControls` uses `fixed bottom-4 left-1/2` (positioned relative to the viewport). When the graph is offset by sidebars or the layout center isn't viewport center, the controls land in the wrong spot — typically appearing below/under the panel.

**Fix**: Render `PositioningTourControls` as **siblings of the opinion panel** inside the same graph wrapper (the `motion.div` at line ~546 in `Index.tsx`), using the same positioning scheme:
- Desktop: `absolute bottom-4 left-1/2` with translate offsets `-translate-x-[calc(192px+56px)]` (Stop) and `translate-x-[calc(192px+16px)]` (Next).
- Mobile: keep `fixed` since the panel is `fixed bottom-20` on mobile.

The controls will move from a top-level `<AnimatePresence>` block into the graph wrapper, right next to the opinion panel.

### Issue 2: Highlight the rating scale during the tour

Add a visual highlight to the disagreement slider section (lines 611–629 in `Index.tsx`) when `tourActive` is true:
- Wrap in a div with `ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg p-2 -mx-2` (only when `tourActive`).
- Add a small pulsing animation via `animate-pulse` on the ring, or a soft `shadow-[0_0_20px_hsl(var(--accent)/0.5)]`.
- Optionally a one-line hint above: `t('positioningTour.rateHint')` → "Rate your disagreement →" / "Bewerte deine Ablehnung →".

### Issue 3: Tour persists / restarts on every node click

**Root cause**: `tourActive` only ends via Stop or when no candidates remain. Clicking any node keeps `tourActive` true, so Next button + highlight reappear forever.

**Fixes**:
1. **Limit to 4 ratings**: end the tour when `tourSeenIds.size >= 4` OR no more candidates (whichever comes first). Update `tourCanContinue` and `handleTourNext` accordingly.
2. **Persist completion**: store `freemind-positioning-tour-done-${topicId}` in `localStorage` once the tour completes (any of: 4 ratings reached, all opinions exhausted, user clicked Stop, OR user closed the panel mid-tour). On opinion submission, only show the congrats overlay if this flag is not set.
3. **Exit tour on manual node selection**: if `tourActive` is true and the user clicks a different node via `handleNodeClick` or `handleSidebarOpinionClick` (not via `handleTourNext`), end the tour immediately. Track tour-driven navigation with a ref/flag (e.g. set `tourSelectionRef.current = true` right before `setSelectedNode` inside `handleTourNext`/`startPositioningTour`, then any node selection where the ref is false means "user-initiated → exit tour").

### Issue 4: Same opinion shown twice

**Root cause**: `pickRandomOpinionForTour` reads from `topicData.opinions` which is the unfiltered list. The seen-set logic looks correct, BUT `handleTourNext` reads `tourSeenIds` from React state — if invoked twice quickly before state commits, both calls see the same set. Also `startPositioningTour` adds the first pick to a local `seen` and sets state, but `handleTourNext` reads from state — a single click should be safe; however if `selectedNode` is reset to the same id (e.g., picking before state updates), duplicates appear.

**Fix**: Use a `useRef<Set<string>>` (`tourSeenRef`) as the source of truth, mutated synchronously inside `pickRandomOpinionForTour` *and* mirrored to state for re-renders. This guarantees no duplicate even with fast clicks.

### Issue 5 (experiment): Thumb rotation visual

Add a hand-with-thumb SVG above (or beside) the disagreement slider in the opinion panel. Map disagreement value to rotation:
- `0` (full agreement) → thumb up → `rotate(0deg)`
- `50` (default) → thumb sideways → `rotate(90deg)`
- `100` (full disagreement) → thumb down → `rotate(180deg)`
- Linear interpolation: `rotation = (disagreement / 100) * 180`.

**Implementation**:
- New file `src/components/ThumbRating.tsx` — renders a `ThumbsUp` lucide icon (front-view substitute) in a circular badge, with `framer-motion` `animate={{ rotate }}` for smooth interpolation.
- Color shifts with rating: green (0) → amber (50) → red (100), via `hsl` interpolation or three discrete tiers.
- Render inline in the opinion panel above the slider: small (~48px) badge centered.

### Files to modify

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Move `PositioningTourControls` inside the graph wrapper as siblings of the opinion panel; add highlight ring around the slider when `tourActive`; cap tour at 4 ratings; persist done-state per topic in `localStorage`; exit tour on manual node selection via ref; switch seen-tracking to `useRef` |
| `src/components/PositioningTourControls.tsx` | Change desktop variant from `fixed` to `absolute` (drop `fixed` class) so it inherits the graph wrapper's positioning context |
| `src/components/ThumbRating.tsx` | New component: rotating thumb icon driven by disagreement value |
| `src/i18n/locales/en.json` & `de.json` | Add `positioningTour.rateHint` keys |

### Notes
- The 4-rating cap is hard-coded; happy to make it configurable if you'd prefer.
- Tour-done flag is per topic, so each new topic gets its own first-time tour.
- Once the tour is done for a topic, the congrats overlay also stops appearing on re-submission/edit of opinion.

