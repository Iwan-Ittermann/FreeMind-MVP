
# UI Fixes Round 2

## 1. Header Button Icons Too Small

The buttons in `Header.tsx` are `h-12 w-12 md:h-14 md:w-14` but the icons inside are only `h-5 w-5 md:h-6 md:w-6`. On desktop the 14x14 button with a 6x6 icon still looks small.

**Fix** (`src/components/Header.tsx`):
- Desktop icons: increase to `h-7 w-7` (from `h-6 w-6`) on `md:` breakpoint
- Mobile icons: keep `h-5 w-5`
- Apply to both the Opinions list button (line 121) and Chats button (line 135)

## 2. Inactive Zone Color Distinction

The inactive zone (between `pinkRadius` and `outerRadius`) blends with the outer/red zone. The gradient in `SignalZones.tsx` needs a distinct grayish fill in that band.

**Fix** (`src/themes/signal/SignalZones.tsx`):
- Change the inactive zone band (`outP%` to `100%`) in the bottom radial gradient from `rgba(50, 57, 78, 0.15)` to a more visible grayish tone like `rgba(40, 45, 60, 0.35)` -- darker and more opaque, clearly distinct from the reddish outer zone
- Also add a visible ring line between outer and inactive at `outP%` radius (dashed circle in the zone boundaries section)
- Ensure inactive node shapes (`#32394E` strokes) still contrast against this background

## 3. Core (Green) Zone Back to 25%

The `greenRadius` in `OpinionGraph.tsx` is currently `outerRadius * 0.35`. Set it back to `outerRadius * 0.25`.

**Fix** (`src/components/graph/OpinionGraph.tsx`, line 66):
- Change `greenRadius: outerRadius * 0.35` to `greenRadius: outerRadius * 0.25`
- The dotted boundary rings in `SignalZones.tsx` already use `zones[].innerRadius` which comes from the config, so they will automatically align with the new 25% value

## 4. Node Hover Hit Area (Flickering on Desktop)

The middle node shape has a ring (`r=12`) and a dot (`r=6`) with empty space between them. When the cursor enters that gap, `onMouseLeave` fires, causing flickering.

**Fix** (`src/themes/signal/SignalNode.tsx`):
- Add an invisible hit-area circle (`r=20`, `fill="transparent"`) as the first element inside the `<svg>` viewBox, before the Shape component. This ensures the entire 40x40 area is hoverable, eliminating gaps between visual elements.

## 5. Floating Chat Window Colors -- Bolder Bubbles

The chat bubbles in `ChatBubble.tsx` use pastel/light colors: `bg-primary/20`, `bg-secondary/20`, `bg-white/10`.

**Fix** (`src/components/chat/ChatBubble.tsx`):
- Own opinion bubble: change `bg-primary/20 border border-primary/30` to `bg-primary/40 border border-primary/50`
- Their opinion bubble: change `bg-secondary/20 border border-secondary/30` to `bg-secondary/40 border border-secondary/50`
- Their regular message: change `bg-white/10` to `bg-white/20`
- Own regular message: keep `bg-primary` (already solid)

## 6. Stats Bar Padding and Chat Count

The opinion count pill sits too close to the circle edge. Also, chat count is missing.

**Fix** (`src/pages/Index.tsx`):
- Change `bottom-2` to `bottom-6` (or `bottom-8`) on the stats bar div to add padding between it and the circle
- The chat count display already exists (lines 258-262) but only shows when `activeChats?.length > 0`. It should always show (even when 0 chats). Change to always render: `{topicData ? ... : null}` showing "0 Chats" when none exist

## 7. Mobile Title Not Visible

The mobile title (line 220-223) uses `text-foreground` which on the dark background may not be visible. Also verify it renders.

**Fix** (`src/pages/Index.tsx`):
- Change `text-foreground` to `text-white` to ensure visibility on the black background
- Also increase from `text-sm` to `text-base` for better readability

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/Header.tsx` | Increase icon sizes to `md:h-7 md:w-7` |
| `src/themes/signal/SignalZones.tsx` | Stronger grayish inactive zone fill |
| `src/components/graph/OpinionGraph.tsx` | `greenRadius` back to `0.25` |
| `src/themes/signal/SignalNode.tsx` | Add transparent hit-area circle for hover |
| `src/components/chat/ChatBubble.tsx` | Bolder bubble colors |
| `src/pages/Index.tsx` | Stats bar padding, always show chat count, fix mobile title color |
