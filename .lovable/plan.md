

## Plan: Mobile-First Layout Overhaul for /home

### 1. Increase graph size on mobile portrait (+20%), center vertically, add padding

**File**: `src/pages/Index.tsx`

- In the `updateSize` callback (lines 83-91), change the mobile calculation from `window.innerWidth - 32` to `window.innerWidth - 16` (tighter horizontal margin) and from `window.innerHeight - 180` to `window.innerHeight - 160` — yielding ~20% more graph area
- Add `py-4` (16px top/bottom) to the graph container, keep `items-center justify-center` for vertical centering
- The graph wrapper already uses flexbox centering; the larger base size handles the rest

### 2. Enlarge node labels, white text, dark backdrop

**File**: `src/themes/signal/SignalNode.tsx` (active theme)

- Increase speech bubble font size from `8px` to `14px`
- Set fill to white at 90% opacity (`#FFFFFFE6`)
- Increase bubble rect dimensions to accommodate larger text (~130×28)
- Add `rx={8}` for rounded backdrop, darken fill to `rgba(0,0,0,0.30)` for the 30% black backdrop
- Widen bubble width from 96 to ~140, adjust text truncation from 16 chars to ~20

**File**: `src/components/graph/GraphNodes.tsx` (default theme fallback — no label rendering currently, skip)

### 3. Expand touch hit targets to 44×44, add cyan selection stroke + glow

**File**: `src/themes/signal/SignalNode.tsx`

- The invisible hit area circle (line 121, `r="20"`) already covers 40px diameter. Increase to `r="22"` for 44px
- On highlight (`isHighlighted`), add a 2px `#00D4FF` (bright cyan) stroke ring around the node shape plus a subtle cyan glow filter
- Add a new SVG filter `signal-select-glow` with cyan feDropShadow

### 4. Move "Add Opinion" to full-width CTA below graph

**File**: `src/pages/Index.tsx`

- Remove the Add Opinion button from `Header.tsx` rendering (keep the component but conditionally hide it when on /home)
- Add a new full-width pill button below the stats bar (after line 357): 44px tall, `rounded-full`, accent background, full-width with max-w, with Pencil icon + "Share Your Opinion" text
- Only show when `canAddOpinion && user && !isLoading`
- Keep the stats counters as secondary elements above the CTA

**File**: `src/components/Header.tsx`

- Accept a new prop `hideAddOpinion?: boolean` and conditionally skip rendering the Add Opinion button when true
- Pass `hideAddOpinion={true}` from Index.tsx

### 5. Move settings to top-right, sidebar buttons to bottom-right

**File**: `src/pages/Index.tsx`

- Move the Settings button from the bottom-left floating stack to a fixed `top-4 right-4` position (or `top-24 right-4` to avoid header overlap)
- Move the Help `?` button to bottom-left (keep as-is, it's already there)
- Remove opinions/chats sidebar buttons from Header and place them as fixed floating buttons at `bottom-6 right-6`, stacked vertically (List icon + MessagesSquare icon)

**File**: `src/components/Header.tsx`

- Accept `hidesSidebarButtons?: boolean` prop; when true, hide the opinions and chats buttons from the header
- Index.tsx passes this prop and renders the sidebar buttons itself in the bottom-right corner

### 6. Horizontal chat bubble stacking (FloatingChatManager)

**File**: `src/components/chat/FloatingChatManager.tsx`

- Change minimized bubbles container from `flex flex-col-reverse` to `flex flex-row gap-2` 
- Position at bottom of screen, horizontally from left to right: `bottom: 24px, left: 24px` with `flex-row`
- Adjust expanded window positioning accordingly — windows stack above the bubble row

### Summary of files to modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Graph sizing, CTA below graph, move settings/sidebar buttons |
| `src/components/Header.tsx` | Add props to hide opinion button and sidebar buttons |
| `src/themes/signal/SignalNode.tsx` | Larger labels, bigger hit target, cyan selection glow |
| `src/components/chat/FloatingChatManager.tsx` | Horizontal bubble stacking |

