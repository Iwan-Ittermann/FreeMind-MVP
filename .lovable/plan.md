

## Step 1 Bug Fixes

### 1. Desktop sidebar collapse: replace mid-panel toggle with bottom button

**Files: `src/pages/Index.tsx`**

Remove the `absolute top-1/2 -translate-y-1/2 -right-3` toggle buttons from both sidebars. Instead, add a full-width button **below** each sidebar panel content area (inside the sidebar div, at the bottom). Button text: "Hide Opinions" / "Show Opinions" and "Hide Chats" / "Show Chats". When collapsed, only the button remains visible (narrow strip with the label + chevron icon).

### 2. Header: white background, show title on mobile too

**File: `src/components/Header.tsx`**

- Change `bg-background/80` to `bg-white dark:bg-background` with `text-black dark:text-foreground` for the title/logo. Ensure the burger icon uses `text-gray-700 dark:text-muted-foreground` so it's visible on white.
- On mobile: show `title` in the header (remove the `!isMobile` guard on the title). Remove the separate mobile title bar from `Index.tsx` (lines 236-242).

### 3. Mobile chat: embed chat UI inside ChatsSidebar instead of FloatingChat

**File: `src/components/ChatsSidebar.tsx`**

Add an `activeChatOpinionId` state inside the component. When a chat item is clicked (in `handleChatItemClick`), instead of calling `onChatOpen`, set `activeChatOpinionId` to the other opinion's ID. This replaces the chat list with an embedded chat view.

The embedded chat view reuses the same hooks (`useChatSession`, `useChatMessages`, `useTypingIndicator`, `useUserBlocks`) and renders the same message list + input UI as `FloatingChatWindow`, but without the floating `motion.div` wrapper — just a simple flex column that fills the sidebar. Add a back button (ArrowLeft) at the top to return to the chat list.

**File: `src/pages/Index.tsx`**

Remove the `openChatWith` mobile branch that sets `activeMobilePanel('chats')`. The `onChatOpen` callback from ChatsSidebar is no longer needed on mobile — chats open inside the sidebar itself. Keep the desktop `FloatingChatManager` path unchanged.

### 4. Mobile graph positioning: fill space between header and bottom panel

**File: `src/pages/Index.tsx`**

The graph container (center div) should use `flex-1` to fill available vertical space between the header and the bottom panel/tab bar. Remove fixed sizing that causes overlap. The graph `height` should be calculated from available space: `window.innerHeight - headerHeight(56) - bottomBar(56) - panelHeight(if open)`.

When the panel is open, the graph area is the remaining ~45vh minus header and bottom bar. The graph should be centered within that area.

### 5. Remove stats badges

**File: `src/pages/Index.tsx`**

Delete lines 244-254 (the stats `<div>` with opinion count and chat count).

### 6. Signal theme: selection highlight warm colors + double moderate node size

**File: `src/themes/signal/SignalNode.tsx`**

- Change selection glow from `#00D4FF` cyan to `#DAA520` gold (matching the warm earth palette). Update both `signal-select-glow` filter `floodColor` and the selection `<circle>` `stroke`.
- Double the `MiddleShape` inner dot radius from `r="6"` to `r="12"` (filling the full node area).

### Files Summary

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Sidebar buttons at bottom, remove mobile title bar, remove stats, fix graph sizing |
| `src/components/Header.tsx` | White bg, show title on mobile, visible burger |
| `src/components/ChatsSidebar.tsx` | Embedded chat view with back button |
| `src/themes/signal/SignalNode.tsx` | Gold selection glow, double moderate node size |

