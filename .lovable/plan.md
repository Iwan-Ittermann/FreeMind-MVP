

## Plan: Fix Unclickable Filter Icon and Account Switch Button

### Problem
Both the notification filter icon and the "Du hast bereits eine Passphrase" button are broken because their dropdown panels are rendered **outside** the `bellRef` / `accountRef` containers. The outside-click handler (`mousedown` listener at line 73-88) sees clicks inside these dropdowns as "outside" clicks and immediately closes the panel before the click action can execute.

### Root Cause
- `bellRef` wraps only the bell button (lines 128-145), but the notification dropdown (lines 188-287) is rendered after `</header>`, outside `bellRef`.
- `accountRef` wraps only the account button (lines 146-158), but the account dropdown (lines 290-357) is also rendered outside `accountRef`.

### Fix
In `src/components/tt/TTHeader.tsx`, expand `bellRef` and `accountRef` to also wrap their respective dropdown panels. This can be done by moving the dropdown `<AnimatePresence>` blocks inside the same `<div ref={...}>` containers, or by creating a second ref for each dropdown and checking both in the outside-click handler.

The simplest approach: wrap each button + its dropdown in a single parent `<div ref={...}>`.

### Scope

| File | Change |
|------|--------|
| `src/components/tt/TTHeader.tsx` | Move the notification dropdown (`AnimatePresence` at line 188) inside `bellRef`; move the account dropdown (`AnimatePresence` at line 290) inside `accountRef` |

Single file change. No database or logic changes required.

