

## Plan: Five Changes

### 1. Create `/test-diskussion` page with form + spreadsheet export

**New file**: `src/pages/TestDiskussion.tsx`
- A simple form page with fields (e.g. name, email, message/opinion) using existing shadcn components
- On submit, save replies to the database in a new `test_diskussion_replies` table
- Add route in `src/App.tsx`

**Database migration**: Create `test_diskussion_replies` table with columns: `id`, `created_at`, `name`, `email`, `message`. Public insert, admin-only select. No auth required for submissions.

**Spreadsheet download**: Add an admin-visible "Download CSV" button that fetches all replies and triggers a CSV download in-browser.

### 2. Fix mobile menu toggle + highlight the menu button

**Problem**: In `BottomTabBar`, tapping "Menu" calls `handleMobilePanelChange('menu')` which sets `activeMobilePanel(null)` and toggles `mobileMenuOpen`. But `BottomTabBar` only highlights based on `activePanel` — since menu sets activePanel to null, it never highlights.

**Fix in `src/components/BottomTabBar.tsx`**:
- Add a new prop `menuOpen: boolean`
- Use `menuOpen` for the menu button's active styling instead of `isActive('menu')`

**Fix in `src/pages/Index.tsx`**:
- Pass `menuOpen={mobileMenuOpen}` to `BottomTabBar`

### 3. Move signup/login button to be always one-click accessible

**Current**: Login button is buried inside MainMenu (settings sheet) or ChatsSidebar.

**Fix**: When user is not logged in, show a persistent login button in the `Header` component on all screen sizes. One tap opens `AuthDialog`.

**Files**:
- `src/components/Header.tsx` — add `user`, `onSignIn` props; render a small login button when `!user`
- `src/pages/Index.tsx` — pass `user` and `onSignIn={() => setAuthDialogOpen(true)}` to Header

### 4. Deactivate all toasts on mobile

**Fix in `src/components/ui/sonner.tsx`**:
- Import `useIsMobile` and conditionally render the `<Sonner>` component only when not mobile. Return `null` on mobile.
- This silences all `toast()` calls on mobile since the Toaster isn't mounted.

Also hide the shadcn `<Toaster>` on mobile in `src/App.tsx` or its component file.

### 5. Ensure Add Opinion CTA is never behind the bottom bar

**Current**: The inline CTA has `lg:mb-14` but no mobile bottom margin, so it can hide behind the 64px bottom tab bar.

**Fix in `src/pages/Index.tsx`**:
- Add `mb-20` (80px) to the CTA wrapper on mobile to clear the bottom bar: change class from `"w-full max-w-sm mt-3 px-4 lg:mb-14 relative z-10"` to `"w-full max-w-sm mt-3 px-4 mb-20 lg:mb-14 relative z-10"`
- Also ensure the selected-node action panel's `bottom-20` is sufficient (currently correct at 80px).

### Files involved
| File | Changes |
|------|---------|
| `src/pages/TestDiskussion.tsx` | New page with form |
| `src/App.tsx` | Add route, conditionally hide Toaster on mobile |
| `src/components/BottomTabBar.tsx` | Add `menuOpen` prop for highlight |
| `src/pages/Index.tsx` | Pass menuOpen, user/onSignIn to Header, fix CTA margin |
| `src/components/Header.tsx` | Add login button for unauthenticated users |
| `src/components/ui/sonner.tsx` | Hide on mobile |
| Database migration | `test_diskussion_replies` table |

