## Plan: Critical Fixes + UI Enhancements (9 Items)

### 1. Fix Graph Determinism (CRITICAL)

**Root cause**: The bot node participates in `resolveCollisions` and gets its angle pushed differently on different screen sizes (because `angularPush = overlap / avgR * 0.5` where `avgR` changes with viewport). This cascading angular push affects all nearby nodes non-deterministically.

**Fix** in `src/lib/freemind-layout.ts`:

- Add a `pinnedIds: Set<string>` parameter to `resolveCollisions`
- The bot node ID goes into `pinnedIds`
- During collision resolution, pinned nodes' angles never change — other nodes absorb the full push (double the angular push for the unpinned node)
- This ensures the bot stays at exactly π/2 (6 o'clock), and nearby nodes deterministically avoid it

### 2. Fix White-on-White Chat Messages

**Root cause** in `ChatBubble.tsx` line 86: Non-own, non-bot, non-opinion messages use `bg-white/20` background with `text-white/90` text. On the Chat page (`/chat`), the container background is `bg-black`, so this works. But if rendered in a light-themed context, it's invisible.

**Fix** in `src/components/chat/ChatBubble.tsx`:

- Change non-own message background from `bg-white/20` to `bg-muted` (theme-aware)
- Change text from `text-white/90` to `text-foreground` for non-own non-opinion messages
- Also fix timestamp color from `text-white/30` to `text-muted-foreground`

### 3. Update Debug TXT

**File**: `debug-chat-animation-investigation.txt`

- Append section documenting the successful fix: shared animation channel registry pattern, why ephemeral channels failed, how `getAnimationChannel`/`setAnimationChannel` solved the delivery problem.

### 4. Replace Pulsating Ring with Unread Badge on Accepted Chat Requests

**File**: `src/themes/signal/SignalNode.tsx` lines 166-176

- Currently shows `animate-gentle-ring-pulse` for `hasIncomingRequest`
- The pulse is for pending incoming requests, which is fine
- But the user wants: when a chat request is accepted or incoming, show an unread badge on the node that accepted
- The issue is that `hasIncomingRequest` is set for pending requests, not accepted ones
- The unread badge at line 155 already handles this with `token.hasUnread && !token.hasIncomingRequest`
- Fix: Remove the `!token.hasIncomingRequest` condition so unread badges always show when there are unread messages, regardless of request status
  &nbsp;

### 5. Fix Desktop CTA Overlapping Bottom Bar

**File**: `src/pages/Index.tsx` lines 378-397

- The "Add Opinion" CTA uses `mt-3` and sits inside the flex column
- On desktop, it can overlap the `DesktopBottomBar`
- Fix: Add `mb-4` or `pb-14` to the CTA container, or use `md:mb-14` on the center column to ensure clearance

### 6. Fix Settings/About Sidebar Close Logic and Width

**Files**: `src/components/ui/sheet.tsx`, `src/components/MainMenu.tsx`, `src/components/AboutSidebar.tsx`

Close logic:

- The Sheet component has a built-in X button (line 60-63 in sheet.tsx)
- The other sidebars (Opinions/Chats) close by clicking outside or tapping the tab again
- For bottom sheets, the X is redundant since users can swipe/tap overlay to close
- Option: Remove the X from the SheetContent for bottom-side sheets by adding a `hideClose` prop, or override in the specific components

Width on desktop:

- Settings and About sidebars should not fill full width
- Constrain to the space between the left (280px) and right (300px) sidebars
- Add `md:mx-auto md:max-w-[calc(100%-580px)]` or `md:left-[280px] md:right-[300px]` to the SheetContent

Label:

- AboutSidebar title should show "About" / "Info" matching the button text

### 7. Mobile Title Placement and Login CTA

**File**: `src/pages/Index.tsx`

- Currently the title is in the Header component
- On mobile, when no sidebar is open, show the title as a separate line below the header
- When a sidebar is open (`activeMobilePanel !== null`), move it back into the header
- Implementation: conditionally render the title in Header only when sidebar is open on mobile, and render a separate title bar below header when not

Login CTA:

- In the right panel (desktop) or the chats mobile panel, when user is not logged in, there's a "log in to see chats" message
- Add a `<Button>` styled like the "Add Opinion" CTA linking to `/auth` below that message

### 8. Create Cluster Visualization Analysis Document

**New file**: `cluster-visualization-analysis.txt`

- Document existing cluster implementation: `CityCluster.tsx` and `ArcaneCluster.tsx` render translucent ellipses based on `clusterId` from SemanticNodeToken
- Note that clustering is computed in `freemind-layout.ts` (mock data) and the tokenizer passes through `node.cluster`
- Signal theme has NO cluster visualization currently
- Propose cross-theme approach: compute clusters in layout algorithm (not theme-specific), assign `clusterId` to all nodes, then each theme renders cluster boundaries in its own style

### 9. Add Preliminary Disagreement Rating Step When Chat Opens

**Files**: `src/components/chat/FloatingChat.tsx`, `src/components/chat/EmbeddedChatView.tsx`

When a chat is opened for the first time (no existing rating):

- Before showing the message input, display a "rate first" overlay/step
- Show the disagreement slider (0-100) with their opinion text
- Add an internal note bubble: "Respect rating set to neutral" / i18n
- On submit, save the rating with empathy=0 (neutral) and the chosen disagreement
- Then transition to the normal chat view
- Use existing `hasNeverRated` / `existingRating` check (already in EmbeddedChatView line 56)

### Files to Change


| File                                       | Change                                         |
| ------------------------------------------ | ---------------------------------------------- |
| `src/lib/freemind-layout.ts`               | Add pinned nodes support to resolveCollisions  |
| `src/components/chat/ChatBubble.tsx`       | Fix text/bg colors for theme compatibility     |
| `debug-chat-animation-investigation.txt`   | Append fix documentation                       |
| `src/themes/signal/SignalNode.tsx`         | Show unread badge regardless of request status |
| `src/pages/Index.tsx`                      | CTA spacing, mobile title, login CTA           |
| `src/components/ui/sheet.tsx`              | Add hideClose prop for bottom sheets           |
| `src/components/MainMenu.tsx`              | Desktop width constraint, use hideClose        |
| `src/components/AboutSidebar.tsx`          | Desktop width constraint, update title         |
| `src/components/chat/FloatingChat.tsx`     | Add preliminary disagreement rating step       |
| `src/components/chat/EmbeddedChatView.tsx` | Add preliminary disagreement rating step       |
| `src/i18n/locales/en.json`                 | Add i18n keys for rating step                  |
| `src/i18n/locales/de.json`                 | Add i18n keys for rating step                  |
| `cluster-visualization-analysis.txt`       | New analysis document                          |
