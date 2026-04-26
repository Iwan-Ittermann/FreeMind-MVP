Plan:
1. Add the next TT onboarding step:
   - Step 3 text: “Du kannst deine Meinung hinzufügen.”
   - Keep the existing flow: step 1 intro, step 2 opinions/nodes, step 3 add-opinion form.
   - Add a “Weiter” button on step 2 so users can continue to step 3.
   - Step 3 can be dismissed/completed with the close button.

2. Highlight the add-opinion form during step 3:
   - Pass a new `highlightAddOpinionForm` flag from `TT.tsx` into `TTBottomPanel` when the tour is open on step 3.
   - Add a visible ring/glow/pulse around the textarea panel, without changing the form behavior.
   - Keep the form clickable/usable during the tour.

3. Ensure the add-opinion form is shown when needed:
   - Keep the existing rule: if the user has not added an opinion for the active topic, show the add-opinion form.
   - Ensure the “Tippe auf einen Punkt …” hint panel is only rendered after `hasOwnOpinion` is true and no opinion is selected.
   - During the step-3 tour, avoid letting the hint panel replace the add-opinion target; the tour highlight should only target the form when the form is available.

Technical details:
- Update `TT_ONBOARDING_OPINIONS_STEP` logic in `src/pages/TT.tsx` to include an additional add-opinion step constant.
- Update `TTOnboardingTour.tsx` to treat step 1 and step 2 as continuable, and step 3 as the final instructional step.
- Update `TTBottomPanel.tsx` with an optional `highlightAddOpinionForm` prop and apply highlight classes to the add-opinion panel wrapper.
- Add translation key `tt.onboarding.addOpinionStep` with “Du kannst deine Meinung hinzufügen.” in both locale files, matching the German-first tour wording.