
# UI Improvements Plan

## 1. Fix Signal Theme Node Selection Jump

**Problem**: In `SignalNode.tsx`, the `<g>` element uses `transform="translate(x,y) scale(s)"` with `transformOrigin` set to the node's absolute coordinates. SVG `transform` attributes don't respect CSS `transformOrigin` properly, so the `scale(1.25)` scales around the wrong point, causing the node to visually "jump".

**Fix**: Keep the outer `<g>` for translation only. Apply the scale to the inner `<svg>` element instead, scaling it around its own center (20, 20 in the 40x40 viewBox). This isolates the scale from the position.

```text
Outer <g>: translate(x, y) only
  Inner <svg>: scale via CSS transform with transform-origin: center
```

**File**: `src/themes/signal/SignalNode.tsx`

---

## 2. Replace InfoPanel with "?" Help Button

**Current**: The left-side `InfoPanel` shows "Meinung", "Chatte", "Bewerte" steps + opinion count, taking up significant horizontal space.

**New**: 
- Remove `InfoPanel` from `Index.tsx` entirely
- Add a floating "?" button above the Settings gear button (bottom-left, stacked vertically)
- Clicking it opens a small tooltip/popover showing a numbered list:
  1. Teile deine Meinung
  2. Frag Chats an
  3. Bewerte deine Chats
- This frees up the entire left column on desktop

**Files**: `src/pages/Index.tsx` (remove InfoPanel, add ? button + popover)

---

## 3. Bigger Circle + Zoom on Mobile

With InfoPanel removed, the layout becomes a single centered column for the graph.

**Desktop**: Increase graph size from `min(viewportHeight - 100, 600)` to `min(viewportHeight - 100, 800)` and center it.

**Mobile**: 
- Default size fills screen width: `window.innerWidth - 32`
- Add a small zoom toggle button (e.g. magnifying glass icon) near the graph
- Two fixed states: "fit" (current, fits in viewport) and "zoomed" (1.4x, allows scrolling)
- Simple toggle between the two sizes

**File**: `src/pages/Index.tsx` (update `updateSize`, add zoom state + button)

---

## 4. Stats (Opinion Count + Chat Count) -- Header Badges

**Best position**: Small inline badges in the header bar, next to the topic title or as subtle pill-shaped counters. They're always visible without taking space.

- Add opinion count (e.g. "42 opinions") and active chat count (e.g. "5 chats") as small text badges in the header, next to the centered title on desktop, or below the title on mobile.
- Data: opinion count from `topicData.opinions.length`, chat count from `activeChats.length` (accepted chats).

**Files**: `src/components/Header.tsx` (add count props + render badges), `src/pages/Index.tsx` (pass counts)

---

## 5. Bigger Header + Buttons

- Header height: increase from `h-14` to `h-16` (desktop and mobile)
- Header buttons: increase from `h-9 w-9` to `h-10 w-10`, icons from `h-4 w-4` to `h-5 w-5`
- "Add Opinion" / "Sign Up" buttons: increase from `h-9` to `h-10`
- Floating settings + help buttons: increase from `h-10 w-10` to `h-12 w-12`

**File**: `src/components/Header.tsx`

---

## 6. Floating Chat Windows -- Reduce Transparency

**Problem**: The floating chat windows use `bg-background` with `bg-muted/50` header and `bg-muted/30` footer, which looks too pastel/transparent.

**Fix**:
- Header: change `bg-muted/50` to `bg-muted`
- Footer: change `bg-muted/30` to `bg-muted/80`
- Main container: add stronger border, e.g. `border-border/80` and a slight `shadow-xl` boost
- Ensure `bg-background` is fully opaque (it should be, but verify)

**File**: `src/components/chat/FloatingChatWindow.tsx`

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/themes/signal/SignalNode.tsx` | Fix scale transform to avoid jump |
| `src/pages/Index.tsx` | Remove InfoPanel, add ? help button, update graph sizing, add zoom toggle for mobile, pass stats to header |
| `src/components/Header.tsx` | Bigger height/buttons, add opinion + chat count badges |
| `src/components/chat/FloatingChatWindow.tsx` | Reduce transparency in header/footer |
