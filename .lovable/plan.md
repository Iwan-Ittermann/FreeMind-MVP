

## Plan: Positioning Tour after Opinion Submission

After the user submits their opinion, launch a guided "positioning tour" that asks them to rate disagreement against several random other opinions. This generates ratings → finer-grained graph layout.

### Flow

1. User submits opinion → instead of toast, show a **congratulations overlay** (centered modal, like the welcome walkthrough).
2. User clicks **"OK, let's go!"** → overlay closes, tour begins.
3. A random other opinion is selected and opened as `selectedNode` (existing opinion panel with disagreement slider appears).
4. Tour-only floating controls anchored to the opinion panel:
   - **Left side: "Next"** button → picks another random opinion not yet shown in this tour, and not the user's own.
   - **Right side: "X"** button → ends the tour.
5. When the pool of unseen opinions is exhausted, the Next button becomes "Done" and ends the tour.
6. Existing disagreement slider auto-saves on change (already implemented via `useDisagreementRating`), so no extra save logic needed.

### State & logic (in `src/pages/Index.tsx`)

- New state: `congratsOverlayOpen: boolean`, `tourActive: boolean`, `tourSeenIds: Set<string>`.
- Trigger: in `handleOpinionSubmitted()`, set `congratsOverlayOpen = true`. **Remove** the `toast.success(t('opinion.submittedGraph'))` call (both in `handleInlineSubmit` and any other path — `SubmitOpinionDialog` already doesn't toast).
- "OK" handler: close overlay, set `tourActive = true`, pick first random opinion (excluding own + AI bot), set as `selectedNode`, add to `tourSeenIds`.
- "Next" handler: pick a random opinion from `topicData.opinions` excluding own opinion, AI bot, and `tourSeenIds`; if none left → end tour.
- "X" handler: `tourActive = false`, `setSelectedNode(null)`.
- When `tourActive` is true, render two floating buttons positioned next to the opinion panel (already at `bottom-4 left-1/2 -translate-x-1/2` on desktop, `bottom-20 left-4 right-4` on mobile). Use absolute positioning relative to the panel via flex siblings or fixed offsets:
  - Desktop: position Next/X as siblings of the opinion panel, vertically aligned at the panel's center, horizontally offset `~ -56px` (left) and `+panel-width+16px` (right).
  - Mobile: place inline above the panel as a small toolbar `[X ............... Next]`.

### Components

- **New file `src/components/PositioningTourCongrats.tsx`**: simple centered modal overlay (same backdrop/styling as the welcome walkthrough block in `Index.tsx` lines 769–812). Title + body + "OK, let's go!" button. Uses i18n keys.
- **New file `src/components/PositioningTourControls.tsx`**: renders Next + X buttons; receives `onNext`, `onSkip`, `canContinue` props. Handles desktop vs mobile layout via `useIsMobile`.

### i18n keys (add to `src/i18n/locales/en.json` and `de.json` under `positioningTour`)

| Key | EN | DE |
|---|---|---|
| `congratsTitle` | "Opinion submitted!" | "Meinung veröffentlicht!" |
| `congratsBody` | "Now let's position your opinion in the graph. Rate how much you disagree with a few other opinions to find your place." | "Jetzt positionieren wir deine Meinung im Graphen. Bewerte ein paar andere Meinungen, um deinen Platz zu finden." |
| `start` | "OK, let's go!" | "OK, los geht's!" |
| `next` | "Next opinion" | "Nächste Meinung" |
| `done` | "Done" | "Fertig" |
| `stop` | "Stop tour" | "Tour beenden" |

### Files to modify

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Add tour state + handlers; remove `submittedGraph` toast; render new congrats overlay + tour controls |
| `src/components/PositioningTourCongrats.tsx` | New centered modal |
| `src/components/PositioningTourControls.tsx` | New floating Next/X controls |
| `src/i18n/locales/en.json` | Add `positioningTour.*` keys |
| `src/i18n/locales/de.json` | Add `positioningTour.*` keys |

### Notes
- Tour does not interfere with the existing onboarding tutorial (`useTutorialContext`); they're independent overlays.
- The disagreement slider inside the opinion panel already auto-saves, so no DB calls are added by this feature beyond the existing rating writes.
- The AI bot opinion (`00000000-0000-0000-0000-0000000000a1`) and the user's own opinion are filtered from the random pool.

