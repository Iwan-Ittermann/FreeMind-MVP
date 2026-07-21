## Root cause (verified)

For topic `7mm9`:
- 4 opinions, **0 chats**, **0 chat_ratings**.
- Only 2 standalone `opinion_ratings` rows exist (AfD→three=100, AfD→one=0).
- In `useTopicData.ts`, ratings without a matching chat are stored as **synthetic** (`empathy = 0`, `isSynthetic: true`).
- `computeTotalPoints` in `tt-layout.ts` skips synthetic ratings → every node's `totalPoints = 0`.
- With all totals at 0, every node hits the "no-activity" branch and is placed at `blueR − tinyPad` (outer ring). Nothing lands at the center. This is the exact behavior observed.

The formula (`empathy × disagreement`) is correct. It just has no empathy data yet, because empathy is only recorded inside chats via `useChatSession.saveRating`. The list-view rating (`TTEmojiRating`) records disagreement only.

Decision: keep the formula. Add a subtle on-graph hint so the empty state doesn't look like a bug.

## Change

Add an "empty state" overlay inside the graph, shown only when **every** real (non-bot) node has `totalPoints === 0` and the graph therefore has no gravitational anchor. Once the first empathy rating (from a real chat) arrives, the hint disappears automatically.

Copy (DE, event build):
> **Noch keine Brückenpunkte**
> Punkte entstehen erst, wenn Teilnehmende miteinander chatten und sich gegenseitig bewerten. Sobald das passiert, rückt die stärkste Brücke ins Zentrum.

EN fallback:
> **No bridging points yet**
> Points are earned when participants chat and rate each other. As soon as they do, the strongest bridge moves to the center.

## Where

- `src/components/tt/TTScreen.tsx` (or the graph host — locate the actual mount point during build; likely wraps `OpinionGraph`). Render a small, non-blocking pill just below the topic title, centered horizontally, `pointer-events: none`, muted foreground, no background blur. Fade in after ~400ms so it doesn't flash during loading.
- Detection: derived from the existing `topicData.ratings` — treat the graph as empty-of-bridging-points when there is not a single non-synthetic rating with `empathy > 0` involving a non-bot opinion. Keep this a pure derived boolean; no extra query.
- i18n: two new keys under `tt.emptyBridging.title` / `tt.emptyBridging.body` in `src/i18n/locales/de.json` and `en.json`.

## Not changing

- `tt-layout.ts` — formula, rank logic, and starter-ring fallback stay as-is.
- `SignalNode.tsx` — point label stays.
- Rating UIs, DB schema, RPCs — all untouched.

## Technical details

- File touches: `src/components/tt/TTScreen.tsx`, `src/i18n/locales/de.json`, `src/i18n/locales/en.json`.
- Empty-state predicate:
  ```ts
  const hasAnyBridging = ratings.some(r => !r.isSynthetic && r.empathy > 0);
  ```
- Only render the hint when `!hasAnyBridging` and `opinions.length >= 2`.
- The hint is a `<div>` overlayed on the graph container with `absolute inset-x-0 top-[…] mx-auto max-w-[80%] text-center text-xs text-muted-foreground pointer-events-none`. No shadcn dialog, no toast.

## Verification

- Load `/7mm9` (current state, no chats): hint appears; nodes remain on outer ring; no console errors.
- Once a real chat with a rating (`empathy > 0`) exists for that topic: hint disappears on next refetch (4s poll already in place), and the layout starts pulling that node inward as designed.
- Type-check passes.
