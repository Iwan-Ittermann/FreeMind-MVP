# UI Fixes Round 3

## 1. Chat Counter Should Count Accepted Chats

The stats bar currently shows `activeChats?.length` which only counts chats with message activity in the last 3 seconds. Change it to use `chatRequests.filter(r => r.status === 'accepted').length` -- the number of accepted chats for the whole topic.

**File:** `src/pages/Index.tsx`

- Pass `userChats.length` (already computed at line 195) or compute a topic-wide accepted chat count
- Note: `userChats` only counts the current user's accepted chats. For a global count, we need to count the `edges` from `topicData.ratings` or use a separate query. The simplest approach: count `topicData.ratings.length` as each rating pair represents an accepted chat edge. Or pass the count from the graph data edges that aren't pending.

Actually, looking more closely: `chatRequests` from `useChatRequests` only returns the current user's requests. For a global count we should count all accepted chat pairs visible in the graph. The graph edges with non-pending status represent accepted chats. We can count `topicData.ratings.length` since each rating entry corresponds to an accepted chat pair.

**Fix:** Replace `activeChats?.length ?? 0` with `topicData?.ratings?.length ?? 0` in the stats bar.

## 2. Stats Bar Below the Graph with Padding

The stats bar is currently `absolute bottom-6` inside the graph wrapper, which overlaps the circle. Move it outside/below the graph entirely.

**File:** `src/pages/Index.tsx`

- Remove the stats bar from inside the `motion.div` (absolute positioned over the graph)
- Place it as a separate `div` below the graph wrapper with `mt-3` margin

## 3. Speech Bubbles Closer to Nodes

The speech bubble offset in `SignalNode.tsx` is `-HALF - 22` = -42px above center. Reduce this to bring bubbles closer.

**File:** `src/themes/signal/SignalNode.tsx`

- Change `translate(0, ${-HALF - 22})` to `translate(0, ${-HALF - 10})` -- 10px gap instead of 22px

## 4. Inactive Zone: Black Background with Grayish Border Ring

The user wants the inactive zone (between `pinkRadius` and `outerRadius`) to be black (matching the page background), not grayish, so inactive nodes (which are grayish `#32394E`) remain visible. Keep the grayish outer ring line.

**File:** `src/themes/signal/SignalZones.tsx`

- Change the inactive band in the radial gradient from `rgba(40, 45, 60, 0.35)` to `rgba(0, 0, 0, 0.6)` -- near-black, clearly distinct from the reddish outer zone
- Keep the `#32394E` ring line at the `outP + 5%` position

## SKIP THIS STEP (5.) AND SAVE IT FOR LATER. CONTINUE WITH STEP 6  
5. Core Zone Gradient Mismatch

The core zone's white/violet tint (`rgba(255, 255, 255, 0.08)`) extends from 0% to `coreP%` (25%), but the dotted boundary ring is also at `greenRadius` (25%). The issue: the gradient band and boundary line are at the same radius, but visually the gradient may appear to extend slightly beyond due to antialiasing. The real problem is the violet/white tint -- it's too visible and creates a large bright area.

**Fix** (`src/themes/signal/SignalZones.tsx`):

- Reduce core zone tint from `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.04)` so it's subtler and the boundary feels accurate
- The dotted lines and gradient stops both use `coreP` from config, so they should match. If there's still a visual mismatch, it may be due to the gradient ring lines (the thin solid rings at zone boundaries). Ensure the ring at `coreP%` matches the dotted circle at `greenRadius`.

## 6. Mobile Title Below Header

The title is currently inside the flex-1 area with `mb-2`. It should sit directly below the sticky header.

**File:** `src/pages/Index.tsx`

- Move the mobile title outside the `flex-1` container, placing it right after the `<Header>` component as a fixed-height bar

## 7. Header Buttons with Visible Outlines

The opinion list and chat list buttons use `variant="ghost"` which has no border.

**File:** `src/components/Header.tsx`

- Change `variant="ghost"` to `variant="outline"` for both buttons, or add `border border-white/20` to their className

## 8. Message Animation Not Working

The `SignalEventMarker` receives events from `messageAnimations` state in `useTopicData`. The flow is:

1. Realtime subscription on `chat_messages` INSERT fires
2. It looks up the chat, then the sender's opinion
3. Adds to `messageAnimations` state
4. Cleared after 1 second

Potential issues:

- The `opinions_public` query (line 192-197 of useTopicData) might fail if the sender's opinion has `visible=false` or if RLS blocks it
- The `events.slice(0, 2)` in `SignalEventMarker` limits to 2 simultaneous animations
- The 1-second cleanup might race with the 1.5-second animation duration

**Fix** (`src/themes/signal/SignalEventMarker.tsx`):

- Increase slice limit from 2 to 5
- The cleanup interval is 1s but animation duration is 1.5s -- increase cleanup threshold from 1000ms to 2000ms

**Fix** (`src/hooks/useTopicData.ts`):

- Change `prev.filter(anim => now - anim.timestamp < 1000)` to `< 2000` to match the animation duration

9. NEW TASK:  Numbering all lines in the circle.   
The user wants to clearly reference the lines in the circle. Put a small non-intrusive number on each line in the circle. start from the center. 

## Summary of File Changes


| File                                      | Changes                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/pages/Index.tsx`                     | Chat counter uses accepted chats count, stats bar below graph, mobile title repositioned |
| `src/themes/signal/SignalNode.tsx`        | Reduce speech bubble Y offset from -22 to -10                                            |
| `src/themes/signal/SignalZones.tsx`       | Inactive zone to black, reduce core zone tint                                            |
| `src/components/Header.tsx`               | Add visible outlines to buttons                                                          |
| `src/themes/signal/SignalEventMarker.tsx` | Increase event limit and match animation timing                                          |
| `src/hooks/useTopicData.ts`               | Increase animation cleanup threshold to 2000ms                                           |
