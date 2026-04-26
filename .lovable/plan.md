Plan:

1. Fix the passphrase login switch in the TT header
- In the account/settings dropdown, make “Du hast bereits eine Passphrase?” open the sign-in form directly.
- Ensure the embedded `AuthForm` starts in login mode when used for this flow.
- Hide/remove the “Du hast noch keine Passphrase?” switch link in this context, since TT users receive a passphrase automatically.
- Keep the normal signup/login behavior elsewhere unchanged.

2. Harden node tapping so the opinion panel opens reliably
- Fix the graph background click handler so it does not pass a fake `GraphNode` value into the selection logic.
- Prevent node clicks from bubbling into the SVG background clearing handler.
- Add mobile-friendly pointer/touch handling on Signal graph nodes so taps are consistently captured.
- Keep sidebar opinion selection behavior working as-is.

3. Add the first TT onboarding tour step
- Create a TT-specific lightweight onboarding overlay for `/tt`.
- First step behavior:
  - shown to new users automatically once
  - centered in the viewport
  - no headline
  - body text: “Hier kannst du produktiv diskutieren!”
- Add localStorage completion state so it does not reappear after dismissal/completion.
- Add a restart action inside the TT header account/settings panel so users can replay the tour.
- Keep the implementation simple and extensible so more steps can be added one by one later.

Technical details:
- Files likely to change:
  - `src/components/AuthForm.tsx`
  - `src/components/tt/TTHeader.tsx`
  - `src/pages/TT.tsx`
  - `src/themes/signal/SignalRenderer.tsx`
  - `src/themes/signal/SignalNode.tsx`
  - `src/i18n/locales/de.json`
  - `src/i18n/locales/en.json`
  - possibly a new `src/components/tt/TTOnboardingTour.tsx` or `src/hooks/useTTOnboardingTour.ts`
- No backend/database changes needed.