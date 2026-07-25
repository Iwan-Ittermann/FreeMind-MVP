# Plan: Layout polish + onboarding tour restore

## 1. Rename `EineWocheEineFrage.tsx` → `Discussion.tsx`
- `git mv src/pages/EineWocheEineFrage.tsx src/pages/Discussion.tsx`, rename the default export `TT` → `Discussion`.
- Update the single import in `src/App.tsx` (`/7mm9` route).

## 2. Center topic title vertically between header and graph
- The title is rendered by `TTHeader.tsx` (or the topic-title block just below it — will confirm on first read in build mode). Add responsive vertical padding so it sits neatly centered in the whitespace between the slim header bar and the outer white ring of the graph.
- Concretely: wrap the `TopicTitleWithLinks` block in a flex container with `py-*` / `my-auto` so it's vertically centered in the gap.

## 3. Tie-aware radial positioning (`src/lib/tt-layout.ts`)
Currently `positives` is sorted by `(total desc, id asc)` and rank determines radius — so two nodes tied at 1450 land at rank 0 (r=0, center) and rank 1 (r=blueR−tinyPad, fringe).

Fix: assign radius per **distinct total**, not per ordinal rank.
- Group positives by `total`. Sort distinct totals descending → `groupIndex` 0..G-1.
- Radius = `(groupIndex / max(G-1, 1)) * (blueR - tinyPad)`.
- Result: all ties share the same radius; collision resolution (`resolveCollisions`) then places them angularly next to each other. When G=1 (all tied), everyone sits at center and gets fanned out by the existing collision loop.
- Deterministic: groups sorted by total; within a group id-sorted order feeds `resolveCollisions`.

## 4. CTA padding above footer
- `TTCenterCTA.tsx` currently anchors to `bottom-[…]`. Increase bottom offset so the pill sits a few px inside the outer white ring and never overlaps the two sidebar pill buttons (`TTSideTabs`).
- Verify against both states (verified users' CTA and the unverified "Registriere dich" pill in `Discussion.tsx`). Both use the same absolute bottom band — bump both.

## 5. Restore onboarding tour (manual only, launched from settings)
- The component `src/components/tt/TTOnboardingTour.tsx` still exists (4 steps, i18n keys `tt.onboarding.firstStep`/`opinionsStep`/`addOpinionStep`/`chatStep`/`ratingStep`, `next`, `done`).
- Wire it back into `Discussion.tsx`:
  - Local state `tourStep` (0..4, 0 = closed).
  - No auto-open. No localStorage gate.
  - Render `<TTOnboardingTour open={tourStep>0} step={tourStep} onNext={…} onDone={()=>setTourStep(0)} />`.
- Add a "Tour starten" button to `ConfigPanel.tsx` that closes the settings sheet and triggers the tour. Communication via a lightweight custom window event (`tt:start-onboarding`) or a prop threaded from `Discussion` → `TTHeader` → `ConfigPanel` — I'll use the event bus pattern already used elsewhere (`tt:subscription-changed`, `tt:close-all-chats`) for minimal wiring.
- Add i18n key `tt.onboarding.startButton` in `en.json`/`de.json` ("Tour starten" / "Start tour").
- Skip pulling from GitHub — component and translation keys are already in the repo.

## Technical notes
- File rename must be single `git mv` to preserve history; App.tsx import update in same step.
- Layout change is purely inside `calculateTTLayout` — no API/prop surface changes.
- Onboarding: uses existing `TTOnboardingTour` component unchanged; only wiring is added.

## Out of scope
- No changes to the tour's content or highlight targeting (steps still non-interactive overlays as they are today).
- No auto-trigger heuristics.
