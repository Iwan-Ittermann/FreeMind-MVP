## Plan: Unified Burger Menu + Rolling Label Rotation

### Overview

Replace all floating buttons (settings, opinions, chats, help) and sidebar triggers with a single burger menu in the header. The burger opens a main menu sheet with navigation items. Add rolling label visibility to the graph (5 visible at a time, rotating every 3 seconds).

### 1. Create Main Menu Sheet (`src/components/MainMenu.tsx`)

New component — a right-side Sheet triggered by burger icon. Contains a list of menu items:

- **About** — navigates to `/` (landing page) but with a close button overlay approach: actually just links to `/` with `onOpenChange(false)`
- **Tutorial** — calls `resetTutorialStatus()` + `startTutorial()` (same logic as current ConfigPanel)
- **Settings** — opens a second-level "Settings" sheet/panel with:
  - Login Secret (passphrase display + copy/download, existing logic from ConfigPanel)
  - Change Opinion (placeholder, disabled)
  - Language (LanguageSwitcher component)
- **All Opinions** — opens OpinionsSidebar
- **Your Requests** — opens a new RequestsSidebar (extracted from ChatsSidebar's "Requests" tab)
- **Your Chats** — opens ChatsSidebar (without the requests tab)
- **Logout** — calls `signOut()` (only shown when logged in; show "Sign In" when logged out)

Props: `open`, `onOpenChange`, `topicId`, callbacks for opening opinions/chats/requests sidebars, `onChatOpen`, `unreadMessageCounts`.

### 2. Create RequestsSidebar (`src/components/RequestsSidebar.tsx`)

Extract the "Requests" tab content from `ChatsSidebar.tsx` into its own Sheet component. Same query logic for pending requests, same inline accept/decline UI. Props: `open`, `onOpenChange`, `topicId`.

### 3. Simplify ChatsSidebar (`src/components/ChatsSidebar.tsx`)

Remove the filter tabs (chats/requests toggle) — only show the chats list. Remove the requests query and related code. Keep search, chat list, unread badges.

### 4. Update Header (`src/components/Header.tsx`)

Add a burger menu button (☰ `Menu` icon from lucide) in the right side of the header. This replaces the sign-up button for logged-out users too (sign-in moves into the menu). Keep `hideAddOpinion` prop behavior .

### 5. Update Index.tsx (`src/pages/Index.tsx`)

- Remove ALL floating buttons: settings (top-right), help (bottom-left), opinions/chats (bottom-right)
- Remove ConfigPanel, help Popover, and floating sidebar button code
- Pass new props to Header or manage MainMenu state here
- Keep the Add Opinion CTA below graph
- Remove zoom button (mobile) — can move to menu or drop

### 6. Rolling Label Rotation in SignalNode

**File**: `src/themes/signal/SignalRenderer.tsx` (or wherever nodes are mapped to SignalNode)

Add state that tracks which node IDs should show labels:

- Maintain a `Set<string>` of 5 visible label node IDs
- Every 3 seconds, swap 2 random IDs out and 2 new ones in (deterministic seed from node IDs to keep consistency)
- Pass `showSpeechBubble` prop based on whether node ID is in the visible set
- The current user's node always shows its label
- Selected/highlighted node always shows its label

Implementation: `useEffect` with `setInterval(3000)` in the renderer component. Keep a ref to all node IDs, rotate through them.

### Files to modify


| File                                   | Change                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `src/components/MainMenu.tsx`          | **New** — burger menu sheet with all nav items + nested settings panel |
| `src/components/RequestsSidebar.tsx`   | **New** — extracted requests list from ChatsSidebar                    |
| `src/components/ChatsSidebar.tsx`      | Remove filter tabs, keep chats only                                    |
| `src/components/Header.tsx`            | Add burger button, remove other buttons                                |
| `src/pages/Index.tsx`                  | Remove all floating buttons, integrate MainMenu                        |
| `src/themes/signal/SignalRenderer.tsx` | Add rolling label rotation logic (5 visible, swap 2 every 3s)          |
