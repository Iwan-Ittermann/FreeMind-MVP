
## Plan

### What I found
- The auth flow is currently split across two paradigms:
  1. inline `AuthDialog` on `/`
  2. leftover route-based auth (`/auth`, `window.location.href = '/auth'`, `navigate('/')` without opening the dialog)
- That mismatch explains the “reload but no dialog” behavior: some entry points still jump routes instead of opening the inline dialog.
- `/admin` currently redirects signed-out users away immediately, so it cannot reliably open its dashboard/auth flow anymore.
- The opinion rating still stores and displays **disagreement** directly, while you now want the UI to ask for **agreement**.

### 1. Fix login so every login CTA uses one single pattern
Use one auth-opening paradigm everywhere: reusable inline `AuthDialog`.

**Implementation**
- Make `AuthDialog` accept an initial mode, so it can open directly in login mode.
- On `/`, keep the dialog inline and open it from all local buttons.
- Replace remaining old auth triggers:
  - `src/components/ChatsSidebar.tsx` (`window.location.href = '/auth'`)
  - `src/components/MainMenu.tsx` fallback `/auth`
  - any remaining `navigate('/')` buttons that are meant to log in, but currently just move pages without opening auth
- For pages outside `/` (especially `/admin`), render the same `AuthDialog` locally instead of bouncing the user away.

**Result**
- No more page reload / redirect loop.
- Every “log in” button behaves consistently.

### 2. Change login CTA copy to “Einloggen / Anmelden” with i18n
**Implementation**
- Add a dedicated i18n key for the combined CTA, e.g. `common.signInOrSignUp`
- Use it for auth-entry buttons:
  - main menu
  - chats sidebar empty state
  - other CTA buttons that open auth
- Keep mode-specific labels inside the dialog (`Einloggen`, `Loslegen` / signup) unless you want those unified too.

**Files**
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/components/MainMenu.tsx`
- `src/components/ChatsSidebar.tsx`
- any other auth CTA surfaces found during implementation

### 3. Switch the opinion scale from “disagreement” UI to “agreement” UI
Keep the backend data model unchanged, but invert the UI mapping.

**Implementation**
- Keep storing `opinion_ratings.disagreement` in the database
- In the UI/hook layer, expose:
  - `agreement = 100 - disagreement`
  - when user moves the slider, save `disagreement = 100 - agreement`
- Update the question text to:
  - DE: `Wie sehr stimmst du dieser Meinung zu?`
  - EN equivalent
- Update endpoints to:
  - left = Disagreement / Widerspruch
  - right = Agreement / Zustimmung

**Why this is the safe approach**
- The graph/layout logic already depends on stored disagreement values.
- By only inverting at the UI boundary, the graph math, layout, and existing ratings stay correct.

**Files**
- `src/hooks/useOpinionRating.ts`
- `src/pages/Index.tsx`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`

### 4. Make `/admin` open the admin dashboard flow again
**Current issue**
- `src/pages/Admin.tsx` redirects unauthenticated users straight to `/`, so `/admin` cannot act as an entry point.

**Implementation**
- Remove the forced redirect for signed-out users.
- Give `/admin` 3 explicit states:
  1. **signed out** → show admin page shell + login CTA that opens `AuthDialog`
  2. **signed in, not admin yet** → show password unlock form
  3. **already admin** → open dashboard immediately
- Use `useIsAdmin()` so admin access persists across reloads and doesn’t rely on local component state.
- Keep the existing server-side password verification flow for granting admin role.

**Files**
- `src/pages/Admin.tsx`
- `src/hooks/useAdminRole.ts`
- `src/components/AuthDialog.tsx`

### 5. Small cleanup to prevent more auth regressions
- Audit remaining `/auth` links in legacy/secondary pages and either:
  - keep them only on unused legacy pages, or
  - reroute them into the new inline auth pattern
- Also fix stale route redirects like `/chat -> /home` while touching routing, since `/home` is no longer the primary entry.

### Files likely involved
- `src/components/AuthDialog.tsx`
- `src/components/MainMenu.tsx`
- `src/components/ChatsSidebar.tsx`
- `src/pages/Index.tsx`
- `src/pages/Admin.tsx`
- `src/hooks/useAdminRole.ts`
- `src/hooks/useOpinionRating.ts`
- `src/App.tsx`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`

### Expected outcome
- Login buttons actually open auth instead of reloading.
- CTA copy becomes `Einloggen / Anmelden`.
- The opinion slider asks for **agreement** while preserving existing backend logic.
- `/admin` works again as a proper entry point and opens the dashboard flow reliably.
