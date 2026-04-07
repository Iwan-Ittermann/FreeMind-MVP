

# Transform `/` into Multi-Topic Platform Homepage

Big architectural shift: `/` becomes the topic discovery page, and each topic graph moves to `/topic/:topicId`.

---

## What Gets Removed

1. **`TopicSelector.tsx`** — delete entirely (unused dropdown, replaced by homepage grid)
2. **`useUserTopics` / `useHasJoinedTopic`** — keep in `useTopics.ts` (still needed for join flow) but remove the gating in `TopicView.tsx` that redirects if not joined (topics are now publicly browsable)
3. **`TopicJoin.tsx`** — simplify: `/t/:slug` now just redirects to `/topic/:topicId` (join happens inline on topic view)

## What Changes

### 1. New Homepage (`/` → new `Home.tsx`)

Create `src/pages/Home.tsx` — the new root page:

- **Header**: sticky top bar with "freemind" logo, nav links (Home, About, Features), and Login button (opens `AuthDialog`)
- **Hero Section**: dark background, centered text:
  - H1: "Hier kannst du dich produktiv mit anderen Meinungen austauschen"
  - Subtitle: "*Insbesondere über polarisierte Themen."
- **Topic Grid**: responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) of topic cards
  - Each card shows: live MiniGraph (with 5-min debounce), topic title, opinion count, chat count
  - Clicking a card navigates to `/topic/:topicId`
- Data source: query `topics` table directly (all Active topics, public read) + aggregate counts via a new lightweight query

### 2. Topic Stats Query

Create a new hook `useTopicStats()` in `src/hooks/useTopics.ts`:
- Queries opinion count and chat count per topic via two simple selects:
  - `opinions` table: `select('topic_id', { count: 'exact' })` grouped per topic
  - `chats` table: same approach
- Returns `Map<topicId, { opinionCount, chatCount }>`
- 5-minute stale time to match the mini-graph debounce

### 3. MiniGraph with 5-Minute Debounce

Modify `MiniGraph.tsx`:
- Remove the "You/Them" legend and the `myOpinionId`/`theirOpinionId` props (not relevant on homepage)
- Add `staleTime: 5 * 60 * 1000` to the `useTopicData` query options so it only refetches every 5 minutes
- Make size configurable (default 180px for homepage cards)

### 4. Route Changes in `App.tsx`

```
/           → Home (new topic discovery page)
/topic/:id  → Index (current graph view, parameterized by topicId)
/home       → redirect to /
/t/:slug    → TopicJoin (kept for invite links)
```

### 5. Index.tsx Becomes Topic-Specific

- Add `topicId` from `useParams` instead of `DEFAULT_TOPIC_ID`
- Route changes from `/` to `/topic/:topicId`
- Everything else stays the same — this IS the current graph view, just parameterized

### 6. Remove Old Traces

- Delete `TopicSelector.tsx`
- Remove `DEFAULT_TOPIC_ID` from `Index.tsx` and `useGlobalPresence.ts` (replace with param/prop)
- `useGlobalPresence.ts`: refactor to accept topicId or detect from current route

---

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Home.tsx` | **Create** — new homepage with hero + topic grid |
| `src/App.tsx` | Update routes: `/` → Home, `/topic/:topicId` → Index |
| `src/pages/Index.tsx` | Replace `DEFAULT_TOPIC_ID` with `useParams().topicId` |
| `src/components/chat/MiniGraph.tsx` | Add 5-min staleTime, remove legend for homepage usage |
| `src/hooks/useTopics.ts` | Add `useTopicStats()` for opinion/chat counts |
| `src/hooks/useGlobalPresence.ts` | Parameterize topicId from route |
| `src/components/TopicSelector.tsx` | **Delete** |

---

## Technical Details

- The `topics` table already has public SELECT RLS — no migration needed
- Opinion and chat counts use `select('*', { count: 'exact', head: true })` with topic filter — no new DB functions needed
- The existing `MiniGraph` already calls `useTopicData` + `calculateLayout` — we just add stale time
- No changes to Supabase schema required

