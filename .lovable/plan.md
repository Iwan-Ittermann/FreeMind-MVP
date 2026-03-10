

## Plan: AI Node Collision Fix + Graph Background Redesign + Navigation Polish

### 1. AI Node Collision Avoidance (`src/lib/freemind-layout.ts`)

**Problem**: The bot node is positioned **after** `resolveCollisions()` (line 533), so it never participates in collision resolution. Other nodes can overlap it.

**Fix**: Move the bot node positioning **before** `resolveCollisions()`, and ensure the collision resolution treats it like any other node. The bot's fixed position (6 o'clock, medium radius) will be set first, then all nodes including the bot go through `resolveCollisions`. Since the bot has a deterministic position and ID, this remains deterministic for all users.

### 2. Graph Background Redesign (`src/themes/signal/SignalZones.tsx`)

Replace the current flat dark circle with the mockup's layered radial design:

- **Dark core**: Deep anthracite/charcoal center fading to dark navy
- **Atmospheric glow**: Large soft glow behind the dark core with warm amber (top-left) and cool teal (bottom-right) color split, bleeding into white page background
- **Concentric ripple rings**: 4-5 thin, subtle light-grey rings with inner glow effect emanating outward beyond the dark core into the white background
- **No sharp edges**: Smooth gradient transitions everywhere
- Zone boundary circles and labels remain inside the dark core

Implementation: Use multiple layered `radial-gradient` and a `box-shadow`-style glow via additional gradient circles. The ripple rings extend beyond `outerRadius` using percentage-based rings on a larger container.

### 3. Mobile Graph Padding (`src/pages/Index.tsx`)

Reduce horizontal padding on mobile to near-zero so the graph circle extends closer to screen edges.

### 4. Bottom Bar Glassmorphism

**Mobile** (`src/components/BottomTabBar.tsx`): Add `backdrop-blur-xl`, semi-transparent background, active tab gets a glowing teal accent line beneath the icon.

**Desktop** (`src/components/DesktopBottomBar.tsx`): Same glassmorphism treatment + active glow for Opinions/Chats toggles.

### 5. Settings Sidebar from Bottom (`src/components/MainMenu.tsx`)

Change `SheetContent side="right"` to `side="bottom"` for both mobile and desktop. On mobile, add Tutorial start button and About button inside the menu.

### 6. About Sidebar (New: `src/components/AboutSidebar.tsx`)

New component: A `Sheet` with `side="bottom"` containing the "How it works" 3-step process content from the About page. On desktop, the About button in `DesktopBottomBar` opens this sidebar instead of navigating to `/about`. Button label shows "Uber" (with umlaut) in German, "About" in English (use existing i18n key).

### 7. Index.tsx Wiring

- Add state for `aboutSheetOpen`
- Pass new handler to `DesktopBottomBar.onAbout` that opens the about sidebar
- On mobile, add About and Tutorial buttons inside `MainMenu`
- Render `<AboutSidebar>` component

### Files to Change

| File | Change |
|------|--------|
| `src/lib/freemind-layout.ts` | Move bot positioning before `resolveCollisions` |
| `src/themes/signal/SignalZones.tsx` | Redesign with radial depth, glow, ripple rings |
| `src/components/BottomTabBar.tsx` | Glassmorphism + active teal glow |
| `src/components/DesktopBottomBar.tsx` | Glassmorphism + active glow + "Uber"/"About" label |
| `src/components/MainMenu.tsx` | Bottom sheet + Tutorial/About buttons on mobile |
| `src/components/AboutSidebar.tsx` | New: "How it works" bottom sheet |
| `src/pages/Index.tsx` | Wire about sidebar, reduce mobile padding |

