## Plan: 5 Changes

### 1. Tutorial: Manual start only, with glowing ? button

**Files**: `src/pages/Index.tsx`, `src/index.css`

- Remove the auto-start `useEffect` (lines 63-71 in Index.tsx) that triggers tutorial on `freemind_new_account`
- Move the "Start Tutorial" button into the `PopoverContent` of the ? button (lines 371-377), alongside the existing 3-step guide
- Track in localStorage whether user has ever opened the ? popover. If not, apply a pulsing glow animation (reuse `animate-pulse-fast` + accent ring styling matching the "add opinion" button)



### 4. Remove report button from chat messages

**File**: `src/components/chat/ChatBubble.tsx`

- Remove the `showReport` state, the `onMouseEnter`/`onMouseLeave` handlers (lines 62-63), the report button hover UI (lines 103-120), and the `ReportDialog` render (lines 124-131)
- Keep reporting only on opinions (already handled in Index.tsx's node action panel)

### 5. Make collision avoidance deterministic

**File**: `src/lib/freemind-layout.ts`

The current algorithm applies pushes sequentially per-pair, meaning iteration order affects the result. Different browsers or different node orderings produce different layouts.

**Fix**: Switch to a **gather-then-apply** approach:

1. Sort nodes by ID before processing (deterministic order)
2. In each iteration, compute all angular displacement deltas into an array without modifying positions
3. After all pairs are processed, apply all deltas simultaneously
4. This ensures the same input always produces the same output regardless of platform