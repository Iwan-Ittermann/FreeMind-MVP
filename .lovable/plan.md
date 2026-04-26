Implement the next onboarding tour step as a continuation of the existing TT tour.

Plan:
1. Extend the TT onboarding tour from a single modal into a small step-based flow:
   - Step 1 keeps the current centered text: “Hier kannst du produktiv diskutieren!”
   - Step 2 shows: “Hier stehen die Meinungen”
   - The close button still completes/dismisses the tour.
   - Add simple next/continue behavior so users can move from step 1 to step 2.

2. Highlight all graph nodes during step 2:
   - Pass the current onboarding step from `TT.tsx` down into the active `TTScreenInner` / `OpinionGraph` / `SignalRenderer` path.
   - Add a `highlightAllNodes`-style prop so this is explicit and only active for the tour step.
   - In `SignalNode`, render a visible glow/ring around every node when this prop is active, without selecting a specific opinion or opening the opinion panel.

3. Keep the rest of the UI stable:
   - Do not change the graph layout or node click behavior.
   - Do not dim the graph or block the visual highlight from appearing.
   - Keep the restart-tour action in the header settings panel; restarting should begin again at step 1.

Technical details:
- Update `TTOnboardingTour.tsx` to accept the current step and callbacks for advancing/completing.
- Update `TT.tsx` to store the current tour step and persist completion in localStorage after the tour is dismissed/finished.
- Add translation key `tt.onboarding.opinionsStep` with the German text “Hier stehen die Meinungen” in both locale files, matching the current German-first tour wording.
- Thread a boolean node-highlight prop through `TTScreen.tsx`, `OpinionGraph.tsx`, `SignalRenderer.tsx`, and `SignalNode.tsx`.