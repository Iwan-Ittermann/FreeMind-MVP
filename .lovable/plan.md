

## Plan: Fix Angular Positioning from Disagreement Ratings + Prevent Flickering

### Problem 1: Angular position not changing

**Root cause**: The `get_graph_pairs` RPC only returns pairs that have **accepted chat_requests**. When a user rates their disagreement with another opinion (via the disagreement slider in the node panel), that `opinion_ratings` row is created, but `get_graph_pairs` never includes it because there's no accepted chat request between those two opinions.

The angular algorithm in `calculateDeterministicAngles()` only sees `ratings` from `get_graph_pairs`, so standalone disagreement ratings are invisible to the layout.

**Fix**: Fetch `opinion_ratings` separately and merge them into the angular calculation.

1. **`useTopicData.ts`**: Add a separate query to fetch all `opinion_ratings` for the topic. Merge them into the `ratings` array used for angular positioning. For pairs that exist in both `get_graph_pairs` (chat-based) and `opinion_ratings`, use the `opinion_ratings` disagreement (since that's the single source of truth now). For pairs only in `opinion_ratings` (no chat), create a synthetic rating entry with empathy=0 and the rated disagreement.

2. **`get_graph_pairs` RPC**: No change needed — it correctly provides empathy data from chats. The disagreement will be sourced directly from `opinion_ratings` in the client.

### Problem 2: Flickering and cost

**Root cause**: Every `opinion_ratings` INSERT/UPDATE fires a Supabase Realtime event, which triggers `queryClient.refetchQueries(['topic', topicId])` — a full graph data refetch. With the 500ms debounce on the slider, this means a DB round-trip every 500ms per user dragging a slider, plus all other users get the refetch too.

**Fix — three-layer approach**:

1. **Remove the `opinion_ratings` realtime listener** from `useTopicData.ts`. This table changes too frequently for realtime to be practical.

2. **Keep the local `invalidateQueries` in `useDisagreementRating`** mutation `onSuccess` — this ensures the rater's own graph updates after their save completes.

3. **Rely on the existing 4-second polling** (`refetchInterval: 4000`) for other users' disagreement ratings to propagate. This is already in place and provides eventual consistency without flickering.

4. **Increase debounce from 500ms to 1000ms** in `useDisagreementRating` to further reduce write frequency.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useTopicData.ts` | Remove `opinion_ratings` realtime listener; fetch opinion_ratings separately and merge into ratings array for angular calc |
| `src/hooks/useOpinionRating.ts` | Increase debounce to 1000ms |

