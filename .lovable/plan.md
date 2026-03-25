

## Plan: Rework User Flow, Fix Non-Determinism, and UI Polish

### 1. Drop Landing Page — Make `/home` the new `/`

**Route changes** (`src/App.tsx`):
- Change `<Route path="/" element={<Landing />} />` to `<Route path="/" element={<Index />} />`
- Remove the `/home` route (or redirect `/home` → `/` for backward compat)
- Keep Landing.tsx file but it won't be routed

**Auth redirect updates**:
- `src/hooks/useAuth.ts`: Change `emailRedirectTo` from `/home` to `/`
- Any `navigate('/home')` calls across the codebase → `navigate('/')`
- Login flow stays the same: unauthenticated users see the graph with an inline "Sign In" CTA already present. The `/auth` page remains for login/signup.

### 2. Fix Graph Non-Determinism

**Root cause**: `adjustForMinSeparation()` in `freemind-layout.ts` line 325 picks push direction via `adjusted > normalizeAngle(placedAngle)` — this is unstable near equal angles. Tiny floating-point variations across refetches cause nodes to flip direction and oscillate.

**Fix** (`src/lib/freemind-layout.ts`):
- In `adjustForMinSeparation`, use a **deterministic tiebreaker** instead of comparing angles: always push in the direction away from the nearest placed node using the node's ID or a consistent positive direction. Specifically, when `dist < minSep`, always push in the **positive** (clockwise) direction rather than comparing angle magnitudes. This removes the non-deterministic flip.
- Same fix in `resolveCollisions`: when two non-pinned nodes overlap with equal radii, the push direction is already deterministic (sorted by ID, `deltas[i] += push` / `deltas[j] -= push`), so that's fine.

### 3. Mobile: Bigger Title, Logo, and Bottom Bar When No Sidebar Open

**Header** (`src/components/Header.tsx`):
- Accept an `enlarged` prop (boolean). When true, use `text-lg md:text-sm` for the logo and `text-lg md:text-lg` for the title.

**Index.tsx**:
- Pass `enlarged={isMobile && !activeMobilePanel}` to `<Header />`.
- When no panel is open on mobile, show the title inside the Header itself (already done via the prop) and remove the separate mobile title bar div (lines 296-302).

**Bottom Tab Bar** (`src/components/BottomTabBar.tsx`):
- Increase height from `h-14` to `h-16` (64px).
- Increase icon size from `h-5 w-5` to `h-6 w-6`.
- Increase text from `text-[10px]` to `text-xs`.

### 4. Remove "Change Opinion" Placeholder

**MainMenu.tsx** (lines 130-143): Delete the entire "Change Opinion" section including the surrounding `<div className="border-t">` separator.

### 5. Tablet UI → Use Mobile Layout

**`src/hooks/use-mobile.tsx`**: Increase `MOBILE_BREAKPOINT` from `768` to `1024`. This forces iPads and tablets (up to 1024px) to use the mobile layout with bottom tab bar, bottom panels, etc. instead of the desktop 3-column layout.

Update `BottomTabBar.tsx` `md:hidden` → `lg:hidden` and `DesktopBottomBar.tsx` `hidden md:flex` → `hidden lg:flex` to match the new breakpoint. Similarly, update any `md:` responsive prefixes in Index.tsx that control sidebar visibility.

### Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | Reroute `/` → Index, redirect `/home` → `/` |
| `src/hooks/useAuth.ts` | Update `emailRedirectTo` to `/` |
| `src/lib/freemind-layout.ts` | Fix `adjustForMinSeparation` direction to always push positive |
| `src/components/Header.tsx` | Add `enlarged` prop for bigger logo/title |
| `src/pages/Index.tsx` | Pass `enlarged` to Header, remove separate mobile title bar, update `/home` refs, adjust `md:` → `lg:` breakpoints |
| `src/components/BottomTabBar.tsx` | Increase height/icons/text, change `md:hidden` → `lg:hidden` |
| `src/components/DesktopBottomBar.tsx` | Change `hidden md:flex` → `hidden lg:flex` |
| `src/components/MainMenu.tsx` | Remove "Change Opinion" placeholder block |
| `src/hooks/use-mobile.tsx` | Increase breakpoint from 768 to 1024 |
| Various files | Replace `navigate('/home')` with `navigate('/')` |

