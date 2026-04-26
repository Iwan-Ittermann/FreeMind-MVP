I’ll tighten the TT onboarding tour behavior with these focused changes:

1. Remove Back and Skip buttons
- In `TTOnboardingTour.tsx`, remove the Back and Skip buttons from the tutorial card.
- Keep only one primary action button.
- Keep the close “X” as an escape/close option unless you want that removed too.
- Remove unused `onBack` wiring from the component and page.

2. Fix the flickering node selection in step 4
- Replace the current random selection effect with a stable “pick once per tour step/topic” approach.
- Store the already-picked demo opinion ID in a ref/state so React re-renders do not keep choosing new random nodes.
- Only select a new random opinion when entering the chat/rating demo step, changing topic, or when the chosen opinion no longer exists.
- This should stop the rapid node flashing/flickering before the panel opens.

3. Make the spotlight overlay dark
- Replace the current `bg-background/75 backdrop-blur-[1px]` spotlight overlay with a dark transparent overlay such as `bg-black/70`.
- Remove backdrop blur from the overlay to avoid performance issues over animated graph content.
- Keep highlighted elements above the overlay: tutorial card, add-opinion form, disagreement scale, or fake chat preview.

4. Rename the final button
- Change the final onboarding button label from:
  - German: `Fertig` → `Los geht's!`
  - English: `Done` → `Let's go!`
- Keep intermediate steps labeled `Weiter` / `Next`.

Technical files to update
- `src/components/tt/TTOnboardingTour.tsx`
- `src/pages/TT.tsx`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`

I’ll preserve the existing step order and the current chat gating behavior.