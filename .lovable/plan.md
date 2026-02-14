
# Part 1: SVG Assets, Node Indicators, Speech Bubbles, Tutorial Overhaul, and Settings Move

This plan covers everything except the floating chat windows (Part 2, later).

## 1. Integrate 5 New Core Zone SVGs

### Asset Details
The 5 new SVGs are complex gradient-based vector files (1000-5000 lines each, 2000x2000/2400x2400 viewBoxes). Unlike the previous stencil-format SVGs, these have no white/black background rectangles -- they consist of clip-path-masked gradient fills on transparent canvas. They should render cleanly at 48x48px without needing background removal.

### Steps
- Copy all 5 SVGs to `src/assets/city/nodes/core/`:
  - `core_zone_node_1.svg` -> `building-1.svg`
  - `core_zone_node_2.svg` -> `building-2.svg`
  - `cor_zone_node_3.svg` -> `building-3.svg`
  - `core_zone_node_4.svg` -> `building-4.svg`
  - `core_zone_node_5.svg` -> `building-5.svg`
- Update `CityNode.tsx`: import all 5, populate `CORE_BUILDINGS` array, remove the TODO comment about duplicates
- Node size may need to be slightly increased (56px or 64px) since these are detailed isometric buildings -- will test at 48px first

### Performance Note
These SVGs are large (1000-5000 lines of gradient stops). When loaded as `<image href>` in the SVG graph, the browser fetches them once and caches. Vite bundles them as static assets with content hashing, so repeat loads are cached. No performance concern.

## 2. Node Indicators

### 2a. "YOU" Flag on Current User's Node
- Add a small red flag element to `CityNode.tsx` rendered when `token.isCurrentUser` is true
- Positioned at the bottom-center of the node (lowest point of the isometric tile)
- Flag shape: small rectangle + triangle pennant, with "YOU" text (font-size ~5px)
- Replaces the current "golden glow circle" for the current user

### 2b. "Online" Sign
- Replace the tiny yellow window glow with a green sign element
- Positioned to the left of the node (left corner of the isometric tile)
- Green rectangle badge with "Online" text (font-size ~5px)
- Only shown when `token.isOnline` and not `token.isCurrentUser`

### 2c. Speech Bubbles with Opinion Text
- Add speech bubble SVG elements showing first 10 characters of `token.opinionText` + "..."
- Positioned above each node (cloud-like speech bubble shape)
- Limited to N nodes total (admin-configurable via `app_settings` table with key `max_speech_bubbles`, default 15)
- Priority: core zone nodes first, then middle, then outer, then inactive
- Bubble styling: white rounded rect with small triangle pointer, dark text, subtle shadow
- New `app_settings` row: key = `max_speech_bubbles`, value = `15`

### Files Modified
- `src/themes/city/CityNode.tsx` -- add flag, online sign, speech bubble rendering
- `src/themes/city/CityRenderer.tsx` -- pass speech bubble limit config, determine which nodes get bubbles
- `src/hooks/useAppSettings.ts` -- no changes needed (generic already)

### Database
- Insert a new `app_settings` row: `max_speech_bubbles` = `15`
- Admin dashboard: add a number input in an existing admin panel to control this value

## 3. Cluster Visualization

The `CityCluster.tsx` already computes cluster groups and renders translucent ellipse backgrounds. Currently these are very subtle pastel overlays.

### Enhancement
- Keep the existing cluster ellipse approach but make colors slightly more saturated and use zone-themed colors:
  - Green-tinted clusters in core/middle zones
  - Sandy/warm clusters in outer zone
- Add thin dashed cluster boundary lines for better visibility
- This pairs well with the zone gradients already in place

## 4. Tutorial Overhaul

### Current State
- Two separate tutorials: "Onboarding" (5 steps, highlights UI buttons) and "Chat" (5 steps, highlights chat elements)
- Triggered via FloatingHelpButton (FAB) or ConfigPanel buttons
- Steps are admin-editable via `tutorial_settings` table
- Auto-start removed previously; FAB is the sole entry point

### New Design: Single Interactive Tutorial
A unified tutorial that starts automatically after first account creation and guides users through actual actions (not just button highlights).

**New Steps:**
1. **Welcome** -- Centered message welcoming the user (no element highlight)
2. **Add Opinion** -- Highlights "Add Opinion" button, asks user to submit opinion. Tutorial **pauses** until the user actually submits (listens for opinion submission event)
3. **Your Tent** -- After submission, highlights the user's node (now a tent since it has no chats yet). Centered message explaining it.
4. **Explore Opinions** -- Asks user to click on 2 other nodes to read their opinions. Tutorial tracks click count, advances after 2 clicks.
5. **Request Chat** -- Asks user to click "Request to Chat" on a node. Pauses until request is sent.
6. **Now We Wait** -- Message: "Now we wait for someone to accept your request!" Tutorial pauses here.
7. **Chat Accepted** -- When a chat is accepted (or user receives an incoming request), the relevant node is highlighted. Message asks user to open the chat.
8. **Chat Started** -- When user opens the chat page, shows chat-specific guidance (rating scales, bridging score). This replaces the old standalone chat tutorial.
9. **Done** -- Final congratulations message.

### Implementation Approach
- New hook: `src/hooks/useOnboardingTutorial.ts` -- manages the unified tutorial state machine
- State is driven by actual user actions (opinion submitted, nodes clicked, chat requested, chat accepted) rather than just "next" button clicks
- Tutorial state persisted in `localStorage` so it survives page refreshes (key: `freemind_onboarding_state`)
- Steps 1-6 happen on the `/home` page; step 7-8 transition to `/chat`
- All step text remains admin-editable via `tutorial_settings` table (tutorial_type = `unified`)
- The `TutorialSettingsPanel` in admin dashboard will be updated to show the new unified steps instead of separate onboarding/chat tabs

### Auto-Start Logic
- After signup in `Auth.tsx`, set a flag in localStorage: `freemind_new_account = true`
- On `/home` page mount, check flag. If set, start the unified tutorial and clear the flag.
- Users can still restart via ConfigPanel

### Comment Out FloatingHelpButton
- Comment out `<FloatingHelpButton>` in both `Index.tsx` and `Chat.tsx`
- Keep the component file for future use

## 5. Hide "Add Opinion" Button After Submission

Currently when `hasExistingOpinion` is true, the button shows as a disabled ghost icon. Instead:
- When user has submitted an opinion, animate the button out with a scale-down + fade transition
- Use `AnimatePresence` from framer-motion for smooth exit
- The button's `data-tutorial="add-opinion-button"` attribute stays for the tutorial to target it pre-submission

## 6. Move Settings Button

- Move the Settings (gear) icon from the header to a fixed position in the lower-right corner of the screen
- Style it as a subtle floating button (similar to the old FAB position)
- This frees up header space and replaces the FAB's visual slot
- Only on the `/home` page; on `/chat` page it stays in the header (or is accessible from the chat UI)

## 7. Error Styling for Opinion Submission

- In `SubmitOpinionDialog.tsx`, when the error is about minimum character length, render the error text in red (already uses `text-destructive` class)
- Add a red border highlight to the textarea when validation fails: `border-destructive`

## Technical Details

### Files to create:
- `src/assets/city/nodes/core/building-1.svg` through `building-5.svg` (copy from uploads)
- `src/hooks/useOnboardingTutorial.ts` -- unified tutorial state machine

### Files to modify:
- `src/themes/city/CityNode.tsx` -- new indicators (flag, online sign, speech bubbles), new building imports
- `src/themes/city/CityRenderer.tsx` -- pass bubble limit, compute which nodes get bubbles
- `src/themes/city/CityCluster.tsx` -- enhanced cluster visuals
- `src/pages/Index.tsx` -- comment out FAB, auto-start tutorial, floating settings button
- `src/pages/Chat.tsx` -- comment out FAB, integrate unified tutorial step 8
- `src/pages/Auth.tsx` -- set new-account flag on signup
- `src/components/Header.tsx` -- animate out opinion button, remove settings button from header
- `src/components/ConfigPanel.tsx` -- add "Restart Tutorial" (unified), remove separate tutorial buttons
- `src/components/SubmitOpinionDialog.tsx` -- red border on validation error
- `src/components/admin/TutorialSettingsPanel.tsx` -- update to show unified tutorial steps
- `src/contexts/TutorialContext.tsx` -- provide unified tutorial context
- `src/hooks/useTutorial.ts` -- replace with unified tutorial logic (or deprecate)
- `src/index.css` -- any new CSS if needed

### Database migration:
- Insert `app_settings` row: key = `max_speech_bubbles`, value = `15`
- Insert new `tutorial_settings` rows for the unified tutorial steps (both EN and DE)
