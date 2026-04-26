I’ll implement this in the TT mobile flow with four focused changes:

1. Add the next onboarding step
- Add step 4 text: “Dann kannst du mit anderen chatten!”
- During this step, automatically select/open a random existing opinion panel for the active topic.
- Prefer a non-own opinion if the user already has an opinion; otherwise pick any visible opinion so the panel can be demonstrated.
- Highlight the “Let’s chat” button clearly with a ring/glow/pulse so it is visibly the target of the step.

2. Improve tour controls
- Replace the current single “Weiter” button layout with elegant compact controls:
  - “Zurück” / “Back” on all steps after the first
  - “Weiter” until the last step
  - “Überspringen” / “Skip” always available
- Keep button sizing balanced and unobtrusive inside the tour card.
- Keep close behavior consistent: X and Skip both finish the tour.

3. Enforce chat gating when no opinion exists
- In every selected opinion panel, keep “Let’s chat” disabled unless the user has already posted their own opinion for the current topic.
- Add disabled styling and a helpful title/tooltip text explaining that the user must add their opinion first.
- Prevent the click handler from opening chats if `hasOwnOpinion` is false, so it is not just visually disabled.
- Keep the chat side-tab/list inaccessible when no own opinion exists by disabling the right “CHATS” tab or showing a “post your opinion first” locked state instead of opening `EmbeddedChatView`.
- Also guard the imperative `openChat()` path in `TTSideTabs`, so no code path can open a chat without `hasOwnOpinion`.

4. Technical touchpoints
- Update `TT.tsx` to manage the new tour step constant, Back/Next/Skip handlers, and random opinion selection for the chat step.
- Update `TTOnboardingTour.tsx` to support Back, Skip, final-step completion, and the new body text.
- Update `TTBottomPanel.tsx` to add `highlightLetsChatButton`, stronger disabled behavior, and safer `onLetsChat` gating.
- Update `TTSideTabs.tsx` to accept `hasOwnOpinion` / locked chat state and prevent chat opening without it.
- Update German and English locale keys for the new step and controls.

I’ll also make sure the previous fix remains intact: users without an opinion should still see the add-opinion form as the default, not the “Tippe auf einen Punkt…” hint panel.