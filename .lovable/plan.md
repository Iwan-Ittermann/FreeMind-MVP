

# Round 3: Bug Fixes & Improvements

Six issues from user testing.

---

## 1. Missing Disagreement Save Button

In `useOpinionRating.ts`: remove auto-save debounce, expose `savedDisagreement` and manual `save()`. In `Index.tsx`: add a 32px circular Check button next to the slider, visible only when value differs from saved.

## 2. DBSCAN Too Coarse

In `freemind-layout.ts`: reduce `eps` from `outerRadius * 0.25` to `outerRadius * 0.10` to produce more granular clusters.

## 3. Cluster Colors in Opinion Sidebar

In `Index.tsx`: compute `nodeClusters: Map<string, number>` from stable layout data, pass to `OpinionsSidebar`. In `OpinionsSidebar.tsx`: render a small colored dot next to each opinion matching its cluster color. Noise nodes (cluster -1) get no dot.

## 4. Chat Bubble Action Menu Disappears on Hover

In `ChatBubble.tsx`: wrap the bubble and the action menu in a single container that handles `onMouseEnter`/`onMouseLeave`, so moving the cursor from the bubble to the menu does not trigger a leave event. Add a small invisible bridge element or overlap to eliminate the gap.

## 5. Chat Activity Filter Not Working

In `Index.tsx`: fix filter logic so opinions with no chat activity use their `created_at` date as the activity timestamp instead of being unconditionally shown or hidden. This means:
- If an opinion has chat activity, use the latest chat message timestamp.
- If an opinion has NO chat activity, use `opinion.created_at` as the fallback date.
- Filter against the cutoff date in both cases.

This way, genuinely new opinions (recently created, no chats yet) are kept, while old opinions that never engaged are filtered out.

In `useTopicData.ts`: ensure the `lastChatActivity` map includes ALL opinions. For opinions without chats, store `null`. The filter in `Index.tsx` will then fall back to `opinion.created_at`.

## 6. Visible Debounce Countdown

In `useStableLayoutData.ts`: add `secondsRemaining` state. When debounce timer starts, set to 60 and decrement via a 1-second interval. Return `secondsRemaining` from the hook. In `Index.tsx`: render a small translucent pill overlay showing "Recalculating in {N}s" when `secondsRemaining > 0`.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks/useOpinionRating.ts` | Remove auto-debounce, expose `savedDisagreement` + manual `save()` |
| `src/pages/Index.tsx` | Add save button, compute+pass `nodeClusters`, fix filter logic (fallback to `created_at`), show countdown |
| `src/lib/freemind-layout.ts` | Lower DBSCAN `eps` to `outerRadius * 0.10` |
| `src/components/OpinionsSidebar.tsx` | Accept `nodeClusters`, render colored dots |
| `src/components/chat/ChatBubble.tsx` | Fix hover area for action menu |
| `src/hooks/useStableLayoutData.ts` | Add `secondsRemaining` countdown state |

