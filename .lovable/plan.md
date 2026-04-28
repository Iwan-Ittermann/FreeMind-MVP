## Goal
Make `/` and short topic URLs like `/8nv5` always present a clean mobile-style TT interface, even on desktop screens.

The issue is caused by parts of the TT screen using `100vw` / `window.innerWidth` for background rings and graph landmarks. On desktop, the TT phone container is correctly capped at `480px`, but the background/landmarks are still calculated from the full browser width, so the graph/rings become huge and the next topic/page break can appear.

## Plan

1. **Use the TT container width as the source of truth**
   - Update `TTScreenInner` so TT background sizing and graph landmarks are based on the actual mobile viewport/container width, not the desktop browser width.
   - Replace the current `window.innerWidth`-based landmark calculation with measurements from the TT section/wrapper.

2. **Make `TTBackground` container-aware**
   - Change `TTBackground` so it can size itself from its parent/mobile viewport width instead of always using `100vw`.
   - This keeps the concentric background rings aligned with the graph inside the `max-w-[480px]` phone frame.

3. **Harden the desktop phone frame**
   - Keep the outer desktop backdrop black and the inner TT UI centered.
   - Ensure the inner phone container has a strict width cap and clips visual overflow so no part of adjacent swipe sections/page breaks leaks into view.
   - Preserve full-width behavior on actual mobile screens.

4. **Preserve vertical swipe behavior**
   - Keep the existing vertical snap/swipe topic browsing.
   - Only constrain what is visible inside the phone frame; do not remove looping/cloned topic sections.

5. **Regression-check responsive behavior**
   - Verify `/` at desktop sizes such as `1366x768` and `1920x1080`.
   - Verify `/` and a short topic URL at mobile `390x844`.
   - Confirm the graph is centered, the rings align, the bottom opinion input remains visible, and no next-topic page break is visible at rest.

## Technical details

Likely edits:
- `src/components/tt/TTScreen.tsx`
  - Replace `viewportW` state with measured section/container width.
  - Use that width for `ttLandmarks`:
    - `coreR = (140 / 600) * mobileWidth`
    - `blueR = (300 / 600) * mobileWidth`
    - `whiteR = (360 / 600) * mobileWidth`
- `src/components/tt/TTBackground.tsx`
  - Add a prop or CSS sizing mode so the background uses the parent TT viewport width (`100%`) rather than global `100vw`.
- `src/pages/TT.tsx`
  - Keep the centered `max-w-[480px]` mobile shell.
  - Add/adjust overflow containment if needed so the desktop view is clean.

No database changes are needed.