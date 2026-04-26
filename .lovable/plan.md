I’ll update the TT onboarding tour with a proper spotlight behavior and the next rating-focused step.

1. Darken the UI during spotlight steps
- For step 2 (“Du kannst deine Meinung hinzufügen.”), add a full-screen dark overlay.
- Keep only these elements above the overlay:
  - the add-opinion form
  - the tutorial box
- This will make the highlighted form clearly visible instead of blending into the rest of the UI.

2. Add the next onboarding step
- Add the new body text:
  “Du kannst anderen zustimmen oder widersprechen.\nUnd du kannst deine Chats bewerten.”
- Add this as the step after the chat step, before the tour finishes.
- Update Back / Next / Skip / Done behavior so the longer tour sequence works correctly.

3. Show the correct highlighted target for the new step
- If the user has already added an opinion to the current topic:
  - open/select a random opinion panel, preferably not their own opinion
  - highlight the disagreement scale inside that opinion panel
  - darken the rest of the UI while keeping the scale and tutorial box above the overlay
- If the user has not added an opinion yet:
  - show a non-functional fake chat preview/window
  - highlight the heart rating icon in that fake chat UI
  - darken the rest of the UI while keeping the fake chat preview and tutorial box above the overlay

4. Implementation details
- `TT.tsx`
  - add a new onboarding rating step constant
  - drive overlay mode per step
  - keep random opinion selection for chat/rating demonstration steps
  - pass new highlight flags into the bottom panel
  - render the fake chat preview only for the no-own-opinion version of the rating step
- `TTOnboardingTour.tsx`
  - add support for the new step key
  - keep the tour card above the dark overlay
  - preserve elegant Back / Skip / Next button sizing
- `TTBottomPanel.tsx`
  - add a `highlightDisagreementScale` prop
  - wrap the disagreement scale area with a clear ring/glow and elevated z-index when active
- Add a small TT-only fake chat preview component or inline block using existing styling and the heart icon, with no real chat actions.
- Update `de.json` and `en.json` with the new tour step text.

I’ll preserve the previous behavior: users without an opinion still see the add-opinion form by default, and real chat access remains blocked until they have posted their own opinion.