## Step 1 Additional Fixes

### 1. Desktop: No page scroll, sidebars scroll internally, bottom bar replaces burger

**File: `src/pages/Index.tsx**`

- Root div: change `min-h-screen` to `h-screen` + `overflow-hidden` to lock the page.
- Desktop sidebars: add `overflow-y-auto` to the content area so they scroll independently.
  &nbsp;
- **Desktop bottom bar**: New fixed bar at the bottom (h-12) with 5 buttons in a row: `Opinions` (wide, toggles left sidebar), `About`, `Tutorial`, `Settings`, `Chats` (wide, toggles right sidebar). The two sidebar buttons (`Opinions`/`Chats`) get `flex-[2]`, the rest get `flex-1`. Remove the current sidebar toggle buttons at the bottom of each panel — sidebars now roll out from a collapsed state triggered by the bottom bar.
- Remove the burger menu from Header on desktop (it's now in the bottom bar).
- Move About/Tutorial/Settings handlers into Index.tsx or pass them down. The bottom bar buttons trigger: About → `navigate('/')`, Tutorial → `tutorial.startTutorial()`, Settings → open settings sheet.

**File: `src/components/Header.tsx**`

- Remove the desktop burger button entirely. Header becomes logo + title only on both mobile and desktop.

### 2. Mobile: Graph visible above panel, header cleanup, tab bar swap

**File: `src/pages/Index.tsx**` (mobile graph)

- The graph container needs explicit height calculation. When panel is open, set graph container to `height: calc(100vh - 56px - 55vh - 56px)` (header - panel - bottom bar). Currently the graph is behind the panel because `flex-1` doesn't account for the fixed-position panel overlay. Change the center div to use a calculated height via inline style when `activeMobilePanel` is set, so the graph sits in the visible gap.

**File: `src/components/Header.tsx**` (mobile)

- Shrink logo text: `text-sm` on mobile instead of `text-lg`. Move to corner with less padding.
- Title: change from `absolute left-1/2 max-w-[50%]` to a flex item that takes remaining space with `truncate` and `text-left`, giving it the full width between logo and edge.

**File: `src/components/BottomTabBar.tsx**`

- Swap order: Opinions, Chats, Menu (currently: Opinions, Chats, Menu → change to: Opinions, Menu, Chats... wait, user said "swap burger and chats" so: Opinions, Chats, Menu → Opinions, Menu, Chats). Actually re-reading: "swap the burger button and the chats button" means Menu comes before Chats. New order: **Opinions, Menu, Chats**.
- Change Menu icon from `Menu` (hamburger) to `MoreVertical` (three dots).

### 3. Desktop bottom bar component

**New file: `src/components/DesktopBottomBar.tsx**`
A horizontal bar with 5 buttons:

- `Opinions` (flex-2, toggles left sidebar, icon: List)
- `About` (flex-1, icon: Info)  
- `Tutorial` (flex-1, icon: GraduationCap)
- `Settings` (flex-1, icon: Settings, opens settings sheet)
- `Chats` (flex-1 → flex-2, toggles right sidebar, icon: MessagesSquare, unread badge)

Fixed at bottom, h-12, bg-white, border-t. Only shown on desktop (`hidden md:flex`).

### Files Summary


| File                                  | Changes                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Index.tsx`                 | `h-screen overflow-hidden`, remove Footer, remove sidebar toggle buttons, add DesktopBottomBar, fix mobile graph height |
| `src/components/Header.tsx`           | Remove desktop burger, shrink mobile logo, expand title space                                                           |
| `src/components/BottomTabBar.tsx`     | Swap Chats↔Menu order, use MoreVertical icon                                                                            |
| `src/components/DesktopBottomBar.tsx` | **New** — desktop bottom nav with 5 buttons                                                                             |
| `src/components/MainMenu.tsx`         | Keep settings sheet logic (reused by DesktopBottomBar via a shared settings sheet state)                                |
