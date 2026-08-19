# Tutorial rework + list/label polish

## 1. New 2-step tutorial

Replace the current 5-step onboarding tour with two steps:

- Step 1: "Klick auf die anderen Meinungen und bewerte deine Zustimmung oder Ablehnung!"
- Step 2: "Jetzt kannst du mit ihnen chatten. Klick auf \"Diskutieren\""

Behavior:
- Both steps stay non-blocking (transparent, `pointer-events-none` backdrop) so the user can tap nodes while reading.
- Step 1 additionally highlights the opinion-difference scale once an opinion is selected; step 2 highlights the "Diskutieren" button (both highlight props already exist in the bottom panel and are currently hard-wired to `false`).
- Step 2's button is the final one ("Los geht's!"), then the tour closes.
- English equivalents added for both steps.

## 2. Settings panel button

Rename the tour button in the settings panel from "Tour neu starten" to "Anleitung starten" (EN: "Start guide"), same key `tt.restartTour`.

## 3. "Bewerten" button in the opinion list

The list already hides "Bewerten" when a rating exists, but the ratings query only refreshes on its own 8s interval, so a rating made in the circle view can leave a stale "Bewerten" button. Fix: invalidate the `myOpinionRatings` query right after a rating is saved, so the list updates immediately.

## 4. Help overlay labels

- Rename the callout label "Meinungen der anderen" to "Andere Meinung" (EN: "Other opinion").
- Mark two other opinion nodes instead of one (random pick count 1 → 2), keeping the existing collision handling.

## 5. "Graph" tab → "Kreis"

Rename the tab label to "Kreis" (EN: "Circle") and swap the icon from the network icon to a circle icon (`CircleDot`), keeping the tab id `graph` internally.

## Technical notes

- `src/components/tt/TTOnboardingTour.tsx`: reduce to 2 steps, new step keys.
- `src/pages/Discussion.tsx`: tour step state max 2, pass highlight flags to `TTBottomPanel` derived from `tourStep`.
- `src/hooks/useOpinionRating.ts`: add `['myOpinionRatings']` invalidation after save.
- `src/components/tt/TTHelpOverlay.tsx`: label key + `pickRandom(others, 2)`.
- `src/components/tt/TTSideTabs.tsx`: tab label/icon.
- `src/i18n/locales/de.json` / `en.json`: new/updated keys (`tt.onboarding.*`, `tt.restartTour`, `tt.help.otherOpinions`, `tt.graphTab`).
