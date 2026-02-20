# Tutorial Fixes Plan

## Summary

Fix multiple tutorial issues: login gate, conditional "Next" button, tooltip positioning, user node highlighting, text changes, and cross-page chat step integration.

---

## Changes Overview

### 1. Login Gate on Tutorial Start

When the user clicks the tutorial help button while not logged in, instead of starting the tutorial, show a small overlay message: "Please login first!" with a link to `/auth` and an X button to close.

**Files:** `src/pages/Index.tsx`, `src/i18n/locales/de.json`, `src/i18n/locales/en.json`

### 2. Step 2 (addOpinion): Show "Next" Button if Opinion Already Exists

Currently step 2 is `waitForEvent: true`, so no "Next" button appears. If the user already has an opinion (`myOpinion` exists), the tutorial should show a "Weiter/Next" button instead of waiting for the event.

**Files:** `src/components/Tutorial.tsx`, `src/pages/Index.tsx`

- Pass `hasExistingOpinion` prop to Tutorial
- In Tutorial, show Next button when `waitForEvent` is true but `hasExistingOpinion` is true (for the `addOpinion` step)

### 3. Step 4 (exploreOpinions): Position Tooltip Higher

The tooltip currently sits centered and overlays the graph circle, blocking node clicks. Force this step's tooltip to appear at the top of the screen instead.

**Files:** `src/components/Tutorial.tsx`

- When `currentStepData.id === 'exploreOpinions'`, override tooltip position to top area of the screen

### 4. Step 3/4: Highlight User's Node with Red Circle

Add a temporary pulsing red circle around the user's node during the `yourTent` step. The `data-user-node="true"` attribute already exists on the SVG node.

**Files:** `src/components/Tutorial.tsx`

- During step `yourTent` , find the `[data-user-node="true"]` element and render a red pulsing ring around it (via an additional highlight overlay)

### 5. Change "waitingForAction" Text

- German: "Fuhre zuerst die Aktion oben aus!" -> "Fuhre zuerst die Aktion aus!" (remove "oben")
- English: Remove the hand emoji from the text
- Both languages: Remove the hand/pointing emoji

**Files:** `src/i18n/locales/de.json`, `src/i18n/locales/en.json`

### 6. Step 7 (chatStarted): Wait for Chat to Open, Then Show in Chat Window

This is the trickiest change. After step 6 (nowWeWait), the tutorial needs to pause and wait until the user actually opens a chat. Then:

- On **mobile**: Step 7 appears inside the `/chat` page, highlighting the rating scales
- On **desktop**: Step 7 appears when a floating chat window opens, highlighting the rating scales

**Approach:**

- Keep `chatStarted` as `waitForEvent: true` so it waits
- The `onChatAccepted` callback already advances from `nowWeWait` to `chatStarted`
- When the user opens the chat (navigates to `/chat` on mobile, or opens floating chat on desktop), call `onChatOpened()` to advance to step 7... but actually step 7 needs to DISPLAY first before advancing
- Restructure: Make `chatStarted` the step that displays the rating highlight. It should render inside the chat UI (both mobile FloatingChat and desktop FloatingChatWindow)
- Re-enable the `ChatTutorial` component on `/chat` page for mobile, but only for step 7
- On desktop, render the tutorial overlay inside `FloatingChatWindow` when the tutorial is on step `chatStarted`
- The tutorial context needs to be accessible from both Index and Chat pages (it already is via TutorialContext)

**Files:** 

- `src/hooks/useOnboardingTutorial.ts` - make `chatStarted` not waitForEvent (it displays content), add a flag for "waiting for chat open"
- `src/pages/Index.tsx` - detect chat open and advance tutorial
- `src/pages/Chat.tsx` - render tutorial step 7 overlay highlighting rating scales
- `src/components/chat/FloatingChatWindow.tsx` - render tutorial step 7 overlay on desktop
- `src/components/Tutorial.tsx` - don't render step 7 (it renders in chat instead)

---

## Technical Details

### Login Gate Implementation

```
// In Index.tsx, wrap the tutorial start:
const handleStartTutorial = () => {
  if (!user) {
    setShowLoginPrompt(true);
    return;
  }
  tutorial.startTutorial();
};
```

Render a small dismissible card with "Please login first!" + link to /auth.

### Step 2 Conditional Button

Pass `myOpinion` existence to Tutorial. In Tutorial.tsx, override `isEventDriven` to false when `hasExistingOpinion && currentStepData.id === 'addOpinion'`.

### Step 4 Tooltip Positioning

In the `useEffect` position calculation, when `currentStepData.id === 'exploreOpinions'`, set tooltip to `top: 80, left: center` regardless of target element position.

### User Node Red Highlight

Find the `[data-user-node="true"]` element's bounding rect and render an additional pulsing red circle overlay during relevant steps.

### Step 7 Cross-Page Integration

- Store tutorial state in localStorage (already done), so it persists across page navigation
- On mobile `/chat` page: check if tutorial is active and on `chatStarted` step, render a highlight overlay on `[data-chat-tutorial="rating-scales-mobile"]`
- On desktop `FloatingChatWindow`: check if tutorial is active and on `chatStarted` step, render a highlight overlay on rating scales
- The `onChatOpened` event should be called when the chat UI mounts, triggering the step to display

### i18n Changes

- DE: `"waitingForAction": "Fuhre zuerst die Aktion aus!"`
- EN: `"waitingForAction": "Do the action first!"`