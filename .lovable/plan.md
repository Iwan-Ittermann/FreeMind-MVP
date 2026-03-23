

## Plan: Fix Synthetic Ratings Affecting Radial Position

### Root Cause

When you rate your disagreement with another opinion (no chat exists), `useTopicData.ts` line 349-355 creates a **synthetic rating entry** with `empathy: 0, disagreement: <your_rating>`. This synthetic entry is merged into the same `ratings[]` array that feeds `calculateFreeMindScore()`.

`calculateFreeMindScore()` (line 37-57) treats ALL entries in the ratings array equally — it doesn't distinguish between chat-based ratings and synthetic disagreement-only ratings. So the target node now has `nodeRatings.length > 0`, meaning:
- `hasChats` flips to `true`
- Its bridging score becomes `0 × disagreement = 0` averaged with any real chat ratings
- This changes its `freeMindScore` → changes its `scoreToLevel()` → changes its radial position

**The fix**: Synthetic entries (disagreement-only, no chat) should only affect **angular positioning**, not radial positioning. Two approaches:

**Option A (cleanest)**: Split the data into two separate arrays:
- `chatRatings[]` — only from `get_graph_pairs` (with real chats) → feeds `calculateFreeMindScore` for radial position
- `allRatings[]` — merged chat + opinion_ratings → feeds `calculateDeterministicAngles` for angular position

This requires `calculateLayout` to accept two rating arrays, or we add a `synthetic` boolean flag to `ChatRating` type and filter inside `calculateFreeMindScore`.

**Option B (minimal change)**: Add `isSynthetic?: boolean` field to `ChatRating`. Set it `true` for disagreement-only entries in `useTopicData.ts`. In `calculateFreeMindScore`, skip synthetic entries. Angular calculation already uses all ratings.

### Recommendation: Option B (minimal diff)

### Files to Change

| File | Change |
|------|--------|
| `src/types/graph.ts` | Add `isSynthetic?: boolean` to `ChatRating` |
| `src/hooks/useTopicData.ts` | Set `isSynthetic: true` on synthetic entries (line 350-355) |
| `src/lib/freemind-layout.ts` | In `calculateFreeMindScore`, filter out `r.isSynthetic` entries before computing radial score |

