## Plan: TT UI Polish + Swipe Architecture

### 1. Side panels — overlay feel, animated from buttons

Replace the full-height `Sheet` with custom Framer Motion panels that **expand from the tab buttons**:

- **Opinions panel**: expands rightward from the left tab. ~75vw wide, ~60vh tall, vertically centered around the tab. Rounded-2xl, glassmorphism (`bg-background/85 backdrop-blur-xl`), strong shadow, subtle border. Origin-left scale + fade.
- **Chats panel**: mirrors from the right tab (origin-right, expands leftward, vertically aligned to the bottom-right tab).
- **Backdrop**: very light blur overlay (`bg-black/20 backdrop-blur-sm`), click-to-close.
- Spring animation: `transition: { type: 'spring', stiffness: 320, damping: 28 }`.

### 2. Bottom panel — expanding input + floating "Posten"

`TTBottomPanel.tsx` (input state):

- Default: collapsed textarea (44px, single line, placeholder visible). No button shown.
- On focus: textarea animates to `min-h-[140px]`, `Posten` button **floats above the panel** (absolutely positioned, `bottom: calc(100% + 8px) right: 12px`), pill-shaped, `bg-primary` with shadow.
- On blur with empty text: collapse back, hide button.
- Use Framer Motion `AnimatePresence` for the floating button.

### 3. Silent auth — cost evaluation + UX

**Cost evaluation**: Silent passphrase signup on every visit creates one `auth.users` row + one `user_topics` row per visitor. Risks:

- Bot/scraper traffic could spam thousands of phantom accounts (Supabase free tier: 50k MAU; paid: $0.00325/MAU above that).
- Mitigations already in place: client IP logging, single opinion per topic per user.
- **Recommendation**: proceed with silent auth, but only call `signUp` **once a real interaction happens** (first opinion submission). Until then, render the UI in a "preview" mode using a local-only ephemeral session. This keeps `auth.users` clean of pure bounces.
  &nbsp;

**UX changes**:

- Remove "Abmelden" / sign-out button from the header dropdown.
- Replace with link `Du hast bereits eine Passphrase? → Anmelden` that opens an inline `AuthForm` (login mode) inside the dropdown — lets the user *switch account*, not log out.

### 4. Notifications bell rework

`TTNotificationsBell.tsx` (bottom-left) becomes a **subscription toggle**, not a panel trigger:

- Default icon: `BellOff` (struck-out) — subscription disabled.
- Toggled icon: `Bell` — subscription enabled.
- Clicking it: New opinions added or new chat requests or accepted requests or new messages are shown in the uniersal notification panel, eachable from the header. 
- This has nothing to do with the browser notifications we used in the old topic view. This feature is aout in-app notifications. 

The **header bell** remains the actual notifications panel trigger (already wired via `onBellClick`). Add real notifications panel content as a dropdown beneath the bell (similar styling to the passphrase dropdown).

### 5. Click-outside to close panels

- Header dropdown (passphrase) and notifications dropdown: wrap each in a `useEffect` listening to `mousedown` on `document`, close if click is outside the panel ref. Standard pattern.
- Side panels: backdrop click already closes them.

### 6. Swipe-to-next-topic — make it functional

Currently `TT.tsx` only renders one `<TTScreen>`. Changes:

**Data layer**:

- New hook `useTTTopics(currentTopicId)` that fetches the **list of public topic IDs** (ordered by `created_at desc`, limit ~20) once. Returns `[prevId, currentId, nextId]` window.
- Each `TTScreen` mounts its own `useTopicData(topicId)` — already topic-scoped, so this works.

**Render**:

- `TT.tsx` renders the prev / current / next `TTScreen` inside the existing scroll-snap container. As the user swipes, `IntersectionObserver` detects which screen is centered and updates the URL (`navigate('/tt/:newId', { replace: true })`) + slides the window forward.
- New chats / opinions for the new topic load automatically because `useTopicData` is keyed on `topicId`.

**Cleanup on swipe**:

- Close any open floating chat bubbles (dispatch a global event `tt:close-all-chats` listened to by the floating chat manager, OR just use a per-screen state that resets on unmount — since each screen is its own React subtree, switching topics naturally unmounts old chat windows).
- Reset `selectedNode` (already per-screen).
- For now: no preservation of open bubbles across topics, as you confirmed.

**This prompt scope**: build the 3-screen window + IntersectionObserver + URL sync. Leave infinite-scroll loading (fetching beyond the initial 20) for a later iteration.

### 7. Files


| File                                        | Action                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/components/tt/TTSideTabs.tsx`          | Replace `Sheet` with Framer Motion overlay panels                                                                       |
| `src/components/tt/TTBottomPanel.tsx`       | Expanding textarea + floating Posten button                                                                             |
| `src/components/tt/TTHeader.tsx`            | Remove sign-out, add "switch account" inline auth link, click-outside close, add notifications dropdown                 |
| `src/components/tt/TTNotificationsBell.tsx` | Convert to subscription toggle (BellOff ↔ Bell), wire to `useBrowserNotification`                                       |
| `src/components/tt/TTScreen.tsx`            | Pass `onBellClick` for header notifications dropdown; ensure `selectedNode` resets cleanly                              |
| `src/pages/TT.tsx`                          | New `useTTTopics` hook + 3-screen swipe window + IntersectionObserver + URL sync                                        |
| `src/hooks/useTTTopics.ts` (new)            | Fetch ordered list of public topic IDs                                                                                  |
| `src/i18n/locales/{en,de}.json`             | New keys: `tt.alreadyHavePassphrase`, `tt.switchAccount`, `tt.notifyOn`, `tt.notifyOff`, `tt.enableNotifications`, etc. |


### 8. Out of scope (this prompt)

- Real silent-signup deferral logic (keep current auth flow for now; remove only the sign-out button + add switch-account UI).
- Infinite scroll beyond 20 topics.
- Persisting open chat windows across topic swipes.