Implement a polished first-time onboarding tour for the /tt experience as an additive overlay only.

Scope

- Add a guided-tour layer on top of the existing /tt UI.
- Do not change graph rendering, node selection logic, chat behavior, rating behavior, auth, routing, or persistence beyond the new onboarding localStorage key.
- Use React Joyride and lazy-load the tour bundle so normal /tt loading stays light.

Implementation plan

1. Add tour package and structure
  - Add `react-joyride` as the guided-tour library.
  - Create a small onboarding module:
    - `src/onboarding/tt-onboarding-steps.ts`
    - `src/onboarding/useOnboardingTour.ts`
    - `src/onboarding/OnboardingProvider.tsx`
    - `src/onboarding/StartTourButton.tsx`
  - Lazy-load `OnboardingProvider` from `src/pages/TT.tsx` with `React.lazy`/`Suspense` so Joyride is split into its own bundle.
2. Add stable additive tour anchors
  - Add `data-onboarding-*` attributes to existing rendered elements only; no behavior changes.
  - Planned anchors:
    - center welcome: no DOM target, Joyride centered modal
    - graph: wrapper around `[data-tt-graph]`
    - visible nodes: use the graph target plus an additive pulse overlay around the graph area
    - opinion CTA: bottom textarea/create-opinion panel and the floating Post button when available
    - chat sidebar: right chat tab/panel area
    - disagreement rating: `TTEmojiRating` row inside the selected-opinion panel
    - chat productivity rating: rating button in `EmbeddedChatView`
  - Missing targets will not crash the tour; steps will fall back to the closest available target or skip gracefully.
3. Create tour state and persistence
  - `useOnboardingTour()` will manage:
    - `isRunning`
    - current step index
    - `startTour()`
    - `skipTour()` / `completeTour()`
    - first-time auto-launch
  - Persist completion exactly as requested:
    - `localStorage.setItem('freemind-onboarding-completed', 'true')`
  - Auto-launch only on `/tt` or `/tt/:topicId` when the key is not set.
  - Manual restart will clear/reset the key and start the tour.
4. Integrate provider into /tt
  - Wrap the existing TT page content with the lazy-loaded `OnboardingProvider`.
  - Pass safe orchestration callbacks only where needed, for example:
    - open the right chat panel for the chat step if available
    - optionally select an existing visible opinion to expose the `Let's chat` and disagreement-rating UI
  - Keep these actions reversible and non-destructive; they only reveal existing UI for explanation.
5. Manual restart from settings
  - Add a compact `StartTourButton` to the TT account/settings dropdown.
  - The button will use the onboarding context, close/open nothing destructive, and restart the tour on demand.
  - This is separate from the older tutorial system already used elsewhere, avoiding conflicts.
6. Visual polish and accessibility
  - Use Joyride with custom styles/classes matching Freemind:
    - glassmorphism tooltip
    - rounded corners
    - soft shadow
    - subtle border/backdrop blur
    - premium dark/neutral styling
  - Provide Back, Next, Skip controls.
  - Final button text: `Let's go!`
  - Enable keyboard navigation and ESC close.
  - Keep spotlight clicks enabled so users can still interact with highlighted UI.
  - Keep scrolling smooth and avoid body scroll locking where possible.
  - Add a lightweight pulse overlay for graph/nodes and primary CTA emphasis.
7. Tour flow content
  - Step 1: centered welcome modal
    - “Hey, hier kannst du produktiv diskutieren.”
  - Step 2: graph canvas
    - “Das sind die Meinungen.”
    - Highlight graph/all visible nodes with subtle pulse.
  - Step 3: opinion creation CTA
    - “Hier kannst du deine eigene Meinung posten.”
    - Emphasize the primary create/post area.
  - Step 4: chat
    - “Dann kannst du mit anderen chatten.”
    - Highlight chat side tab/panel and the selected-opinion panel containing `Let's chat`.
  - Step 5: ratings and completion
    - “Du kannst anderen Meinungen zustimmen oder widersprechen.\nUnd die Produktivität deiner Chats bewerten.\nDadurch entsteht die Verteilung im Kreis.”
    - Highlight both rating systems using additive overlay highlights; if one target is unavailable, still explain and highlight the available one.

Technical notes

- `react-joyride` supports continuous tours, keyboard navigation, ESC close, spotlight interaction, and callbacks for missing targets/step changes.
- Multi-target highlighting will be handled by a small additive overlay component controlled by the provider, because Joyride itself spotlights one primary target at a time.
- No database or Lovable Cloud changes are needed.
- No changes to generated backend/client files.

Validation

- Run TypeScript/build checks after implementation.
- Verify `/tt` first-time auto-launch, completion persistence, manual restart, skip, back/next, ESC close, and missing-target resilience.
- Confirm no console errors and no regressions to graph interactions, side tabs, opinion posting, chat opening, and rating controls.