## Plan: 5 Fixes — Label Overflow, Naming, Stale Slider, Edge Visibility, Level Rings

### 1. Speech Bubble Text Overflow

`**src/themes/signal/SignalNode.tsx**` line 91: The bubble rect is 140px wide with text centered at x=0, but long text overflows left. Fix: truncate `bubbleText` more aggressively (e.g., 16 chars on mobile) and use `textLength`/`lengthAdjust` or just ensure the text never exceeds the rect by measuring character count vs available width. Simplest: reduce max chars from 20 to 16 and widen rect slightly to 150px.

### 2. Rename "Opinion Rating" → "Disagreement Rating", "Chat Rating" → "Respect Rating"

This is mostly a naming/comment cleanup. The i18n keys already use `disagreementRating`. Changes needed:

- `**src/hooks/useOpinionRating.ts**`: Rename hook to `useDisagreementRating`, update JSDoc
- `**src/pages/Index.tsx**`: Update import/usage
- `**src/types/graph.ts**`: Rename `OpinionRating` → `DisagreementRating`; rename `ChatRating` → `RespectRating` (or keep internal name but update comments)
- `**src/components/chat/RatingSliders.tsx**`: Update labels/comments to say "respect rating"
- `**src/lib/freemind-layout.ts**`: Update comments

Actually, renaming types across 9+ files is risky. Cleaner approach: keep type names but update all **comments and user-facing strings** to use "disagreement rating" and "respect rating". The hook file can be renamed.



### 5. Discrete Level Rings with Zone Colors

`**src/themes/signal/SignalZones.tsx**`: Add thin circles at each of the 10 discrete level radii. Use the `levelToRadius` function logic (or replicate the anchor radii). Color by zone:

- Levels 10-7 (respectful): gold/amber thin lines
- Levels 6-4 (moderate): green thin lines  
- Levels 3-2 (extreme): orange/red thin lines
- Level 1: outer border (already exists)

Compute radii from config using the same anchor math as `levelToRadius` in `freemind-layout.ts`.

### Files to Change


| File                                    | Change                                                | &nbsp; |
| --------------------------------------- | ----------------------------------------------------- | ------ |
| `src/themes/signal/SignalNode.tsx`      | Fix bubble text truncation and rect width             | &nbsp; |
| `src/hooks/useOpinionRating.ts`         | &nbsp;                                                | &nbsp; |
| `src/pages/Index.tsx`                   | Update import name                                    | &nbsp; |
| `src/themes/signal/SignalRenderer.tsx`  | &nbsp;                                                | &nbsp; |
| `src/themes/signal/SignalEdge.tsx`      | &nbsp;                                                | &nbsp; |
| `src/themes/signal/SignalZones.tsx`     | Add 10 discrete level rings with zone-colored strokes | &nbsp; |
| `src/components/chat/RatingSliders.tsx` | Update comments to say "respect rating"               | &nbsp; |
| `src/lib/freemind-layout.ts`            | Update comments                                       | &nbsp; |
