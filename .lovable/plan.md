

## Plan: Bottom Bar, Desktop Panels, Signal Theme Overhaul, Mobile Chat-in-Sidebar, /chat Removal

This is a large plan. I'll mark what goes in **Step 1** (this implementation) vs **Step 2** (later).

---

### Step 1 Scope

#### 1. Mobile Bottom Tab Bar + Bottom Panels

**New file: `src/components/BottomTabBar.tsx`**
Fixed bar at bottom (h-14, z-60), 3 buttons: Chats (MessagesSquare + unread badge), Opinions (List + count), Menu (burger icon). Each toggles `activeMobilePanel` state. Tapping active tab closes it.

**New file: `src/components/BottomPanel.tsx`**
Custom framer-motion panel that slides up from bottom to ~55vh. No blocking overlay — graph stays visible and shrinks. `rounded-t-2xl bg-black/95 backdrop-blur`. Sits above BottomTabBar (bottom-14).

#### 2. Graph Shrinking on Mobile Panel Open

**File: `src/pages/Index.tsx`**
- Track `activeMobilePanel: 'chats' | 'opinions' | 'menu' | null`
- When panel is open: graph height shrinks to `~40%` of viewport via `transition-all duration-300`
- The CTA ("Add Opinion") sits between the shrunken graph and the panel, only shown when user has no opinion
- Stats badges move below the title bar (both mobile and desktop)

#### 3. Sidebar Highlighting from Opinion/Chat Click

**File: `src/pages/Index.tsx`**
- When user clicks an opinion in the sidebar, set `selectedNodeId` to that opinion's ID (highlights it in the graph)
- When user clicks a chat in the sidebar, set `selectedNodeId` to the other party's opinion ID
- Works on both mobile (shrunken graph) and desktop (side panels)

#### 4. Remove All Labels from Graph

**File: `src/themes/signal/SignalRenderer.tsx`**
- On mobile: never show speech bubbles (`showSpeechBubble={false}` always)
- On desktop: only show speech bubble for the `highlightedNode` (clicked from sidebar)
- Remove rolling label rotation logic entirely
- Pass `isMobile` from Index → OpinionGraph → renderer (or use the hook directly)

**File: `src/components/graph/OpinionGraph.tsx`**
- Add optional `showLabels?: 'none' | 'highlighted-only'` prop, forward to renderers

#### 5. Desktop 3-Column Persistent Layout

**File: `src/pages/Index.tsx`**
- On desktop: render `[OpinionsSidebar | Graph+title+stats+CTA | ChatsSidebar]`
- Each side panel has a collapse toggle (ChevronLeft/ChevronRight) to hide it
- Panels are inline, not Sheet overlays

**Files: `src/components/OpinionsSidebar.tsx`, `src/components/ChatsSidebar.tsx`**
- Add `variant?: 'sheet' | 'inline'` prop
- When `inline`, render the content directly (no Sheet wrapper), return a `<div>` with same internals
- Add `onOpinionClick?: (opinionId: string) => void` callback to OpinionsSidebar for highlighting
- Add `onChatClick?: (theirOpinionId: string) => void` callback to ChatsSidebar for highlighting

#### 6. Merge Requests Back Into ChatsSidebar

**File: `src/components/ChatsSidebar.tsx`**
- Re-add tabs: "Chats" | "Requests"
- Under Requests: reuse logic from `RequestsSidebar.tsx` (inline accept/decline)
- `RequestsSidebar.tsx` becomes unused (keep for now, clean later)

#### 7. Header Cleanup

**File: `src/components/Header.tsx`**
- Mobile: remove ALL buttons (burger moved to bottom bar). Header = logo only + title
- Desktop: keep burger for About/Tutorial/Settings only

**File: `src/components/MainMenu.tsx`**
- Remove Opinions/Chats/Requests links (now in bottom bar on mobile, always visible on desktop)
- Keep About, Tutorial, Settings, Login/Logout

#### 8. Remove /chat Route — Mobile Chats in Sidebar

**File: `src/pages/Index.tsx`**
- On mobile, when user opens a chat (from sidebar, from opinion accept, from edge click): render `FloatingChat` component *inside the bottom panel* instead of navigating to `/chat`
- Track `activeChatOpinionId` state; when set, the Chats panel renders the full chat UI
- Back button in chat returns to chat list

**File: `src/App.tsx`**
- Keep `/chat` route for now (backwards compat) but it redirects to `/home`

**Files with `/chat` navigation to fix:**
- `src/pages/Index.tsx` — 4 places: `handleAcceptRequest`, `handleOpenChat`, `handleFloatingChatOpen`, `handleEdgeClick`
- `src/components/OpinionsSidebar.tsx` — `handleAcceptRequest` (line 113), `handleOpenChat` (line 134)
- `src/components/ChatsSidebar.tsx` — `handleChatClick` fallback (line 128)
- `src/pages/TopicView.tsx` — 3 places (lines 126, 147, 153) — these stay as-is for now (TopicView is separate)

All mobile navigations to `/chat` become: open the chat panel with `activeChatOpinionId`.

#### 9. Signal & Noise Theme: "Warm Earth" Palette + Node Simplification

**File: `src/themes/signal/SignalZones.tsx`**
New palette:
- Background: `#1A1A2E` (dark charcoal)
- Core zone tint: `rgba(218, 165, 32, 0.06)` (golden amber)
- Middle zone tint: `rgba(107, 142, 35, 0.05)` (sage green)
- Outer zone tint: `rgba(204, 85, 0, 0.06)` (burnt orange)
- Inactive: `rgba(120, 113, 108, 0.04)` (stone gray)
- Zone boundary lines: gold for core, sage for middle, orange for outer
- Zone labels update colors to match

**File: `src/themes/signal/SignalNode.tsx`**
- **Core nodes**: Remove outer ring. Keep the star/diamond shape, fill with golden amber `#DAA520`
- **Middle nodes**: Remove the outer ring (`<circle r="12">`). Keep inner dot, change to sage green `#8FBC5E`
- **Outer nodes**: Keep red square, change to burnt orange `#CC5500`
- **Inactive**: Keep dashed circle, change to stone `#78716C`
- Update `signal-glow-gold` filter to use `#DAA520`
- Selection glow: keep cyan `#00D4FF` (contrast works well against warm bg)

**File: `src/pages/Index.tsx`** (and overall page)
- Change `bg-black` to match theme background `bg-[#1A1A2E]`

#### 10. Message Animations — Verify Across Themes

All three themed renderers already have EventMarker components with flying dot animations:
- **Signal**: white dots (#FFFFFF), up to 5 simultaneous — good
- **Arcane**: golden dots (#FFD54F), up to 2 — good
- **City**: yellow dots (#FFE082), up to 2 — good
- **Default theme** (`OpinionGraph`): uses `MessageDots` component — good

These are driven by `messageAnimations` from `useTopicData`. They're deterministic (all users see them when messages are sent). No fix needed — just confirming they work.

---

### Step 2 (Later / Scheduled)

- **Unread badge audit** — verify badges can actually be resolved/cleared
- **TopicView.tsx** `/chat` navigation cleanup (separate page, lower priority)
- **Delete `RequestsSidebar.tsx`** after confirming merge into ChatsSidebar works
- **Delete `/chat` route entirely** from App.tsx once confident
- **Button design audit across themes** — verify all themes share the same UI button components (they do — all use shadcn Button)

---

### Files Summary

| File | Change |
|------|--------|
| `src/components/BottomTabBar.tsx` | **New** — mobile bottom nav |
| `src/components/BottomPanel.tsx` | **New** — slide-up panel without overlay |
| `src/pages/Index.tsx` | Major rewrite: 3-col desktop, bottom panels mobile, graph shrinking, in-sidebar chat, remove /chat nav, bg color |
| `src/components/Header.tsx` | Strip all mobile buttons |
| `src/components/MainMenu.tsx` | Remove sidebar links |
| `src/components/ChatsSidebar.tsx` | Add variant prop, re-add requests tab, onChatClick callback |
| `src/components/OpinionsSidebar.tsx` | Add variant prop, onOpinionClick callback, remove /chat nav |
| `src/components/graph/OpinionGraph.tsx` | Add label mode prop |
| `src/themes/signal/SignalRenderer.tsx` | Remove rolling labels, pass label mode |
| `src/themes/signal/SignalNode.tsx` | Warm earth palette, remove core/middle rings |
| `src/themes/signal/SignalZones.tsx` | Warm earth palette |
| `src/App.tsx` | Redirect /chat to /home |

