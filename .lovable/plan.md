

## Plan: Inline Auth, Mobile Title, Edge Flash Fix, Settings Sidebar

### 1. Inline Auth — Replace `/auth` with Dialog on `/`

Instead of navigating to a separate `/auth` page, show the auth form as a **modal dialog** on the home page. This keeps users in context.

**Changes:**
- Extract the auth form from `Auth.tsx` into a reusable `AuthDialog` component that accepts `open`/`onOpenChange` props and wraps the form in a Dialog/Sheet
- In `Index.tsx`: add `authDialogOpen` state, replace all `navigate('/auth')` calls with `setAuthDialogOpen(true)`, render `<AuthDialog>`
- In `MainMenu.tsx`: accept an `onSignIn` callback prop instead of navigating to `/auth`
- Keep `/auth` route working (redirect to `/` or render the dialog standalone) for backward compat
- Remove the redirect logic from Auth.tsx since auth now happens inline

### 2. Mobile Title — Show Below Header, Not Inside It

When no sidebar is expanded on mobile, the title should be a **standalone line below the header**, not crammed inside it. This uses whitespace more efficiently.

**Changes** (`Header.tsx` + `Index.tsx`):
- `Header.tsx`: When `enlarged` is true, do NOT render the title in the header — only show the logo (bigger)
- `Index.tsx`: Add a standalone title section below the Header when `isMobile && !activeMobilePanel`, displayed as a centered text above the graph

### 3. Edge Flash Fix — All Edges Briefly Visible on Un-hover

**Root cause**: `SignalRenderer.tsx` line 114 uses a parent `<g>` with `opacity: highlightedNode ? 1 : 0` and a CSS transition. When `highlightedNode` becomes null, ALL edges momentarily have `isDimmed = false` (since there's no highlighted node), so they all compute non-zero opacity. During the group's fade-out transition, all edges "flash" visible.

**Fix** (`SignalRenderer.tsx`): Remove the group-level opacity transition. Instead, always render the group at full opacity and have each `SignalEdge` handle visibility: when `highlightedNode` is null, pass a new prop `hidden={true}` (or set `isDimmed` for all edges). Simplest: change the `isDimmed` logic so that when `highlightedNode` is null, all edges are dimmed (opacity 0).

Change line 114: `style={{ opacity: highlightedNode ? 1 : 0, transition: 'opacity 0.2s ease' }}` → remove this entirely.

Change line 120: `isDimmed={!!(highlightedNode && ...)}` → `isDimmed={!highlightedNode || (et.sourceId !== highlightedNode && et.targetId !== highlightedNode)}`

This way: no highlighted node = all edges dimmed (opacity 0). Highlighted node = only connected edges visible. No flash.

### 4. Settings Sidebar Close on Mobile Tab Switch

**Root cause**: The `handleMobilePanelChange` function (line 102-110) correctly sets `mobileMenuOpen(false)` when switching to another panel. However the `MainMenu` uses a `Sheet` component which may have animation timing issues.

**Fix** (`Index.tsx`): Make the menu behave like other panels by integrating it into the `activeMobilePanel` state instead of using separate `mobileMenuOpen` state. When `activeMobilePanel` changes, force-close the menu sheet. Add a `useEffect` that sets `mobileMenuOpen(false)` whenever `activeMobilePanel` changes to a non-null value.

### Files to Change

| File | Change |
|------|--------|
| `src/components/AuthDialog.tsx` | **New** — Extract auth form as dialog component |
| `src/pages/Index.tsx` | Add AuthDialog, standalone mobile title, fix menu close, update auth navigation |
| `src/pages/Auth.tsx` | Redirect to `/` or keep as thin wrapper |
| `src/App.tsx` | Update `/auth` route |
| `src/components/Header.tsx` | When `enlarged`, only show logo (no title) |
| `src/components/MainMenu.tsx` | Accept `onSignIn` prop instead of navigating |
| `src/themes/signal/SignalRenderer.tsx` | Remove group opacity, fix isDimmed logic |

