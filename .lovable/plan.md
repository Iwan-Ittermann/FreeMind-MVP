

## Full Plan: Graph Refactor + UI Enhancements + Rating Architecture

**Status check**: Zone naming (Addition A) is ~95% done. Discrete levels, welcome popup, inline CTA, opinion_ratings table, and chat cleanup are all NOT yet implemented.

---

### 1. Welcome Popup

**`src/pages/Index.tsx`**: Show a one-time dialog on first visit (tracked via `localStorage` key `freemind-welcome-seen`). Content: "Willkommen zu freemind! Hier kannst du deine Meinung teilen und sehen, was andere denken." / English via i18n. Single "OK" button.

### 2. Inline Opinion CTA

**`src/pages/Index.tsx`**: Replace the "Add Opinion" button with a compact 2-line textarea + send icon. User types directly and submits — saves one click. Reuse submission logic from `SubmitOpinion.tsx`.

### 3. Discrete Scale Levels (Graph Layout)

**`src/lib/freemind-layout.ts`**: Replace continuous `scoreToRadius()` with a 10-level discrete system.

```text
Level 10: Center (radius ≈ 0)
Level 9-7: Respectful zone (inside respectfulRadius)
Level 6-3: Moderate zone (respectfulRadius → moderateRadius)
Level 3:   Default for new/unrated nodes (moderateRadius border)
Level 2-1: Extreme zone (moderateRadius → outerRadius)
```

New functions: `scoreToLevel(score)` and `levelToRadius(level, config)`. Nodes snap to discrete rings. Add `level` field to `GraphNode` (already in types).

### 4. Drop Inactive Zone

**`src/lib/freemind-layout.ts`**: Remove separate inactive node positioning. Nodes without chats get score=0 → Level 3 → placed at `moderateRadius`. They look and behave like moderate nodes.

**`src/themes/signal/SignalZones.tsx`**: Remove inactive zone rendering. Extend extreme zone to `outerRadius`. Only 3 zone labels: Respectful, Moderate, Extreme.

**`src/themes/signal/SignalNode.tsx`**: Remove `InactiveShape`. All nodes use zone-appropriate shapes.

**`src/themes/tokenizer.ts`**: Remove `hasChats === false → inactive` fallback.

### 5. Zone Naming Cleanup (Addition A — finish remaining 5%)

Fix stale comments in `SignalZones.tsx` and `types/graph.ts` that still reference "greenRadius", "yellowRadius", "pinkRadius". Already 95% done.

### 6. Clean Rating Architecture (Addition B)

**Goal**: Single responsibility — `opinion_ratings` owns disagreement, `chat_ratings` owns empathy.

#### 6a. DB Migration

```sql
CREATE TABLE public.opinion_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  rater_opinion_id uuid REFERENCES public.opinions(id) ON DELETE CASCADE NOT NULL,
  target_opinion_id uuid REFERENCES public.opinions(id) ON DELETE CASCADE NOT NULL,
  disagreement integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (rater_opinion_id, target_opinion_id)
);
-- RLS: all authenticated can read; users can insert/update own ratings
```

#### 6b. Update `get_graph_pairs` RPC

Join `opinion_ratings` for disagreement (AVG) and `chat_ratings` for empathy (AVG). Return both. Defaults: disagreement=50, empathy=0.

#### 6c. New hook: `src/hooks/useOpinionRating.ts`

Upsert/fetch from `opinion_ratings`.

#### 6d. Chat UI — empathy only

- **`RatingSliders.tsx`**: Remove disagreement slider. `onSubmitRating` becomes `(empathy: number) => void`.
- **`FloatingChatWindow.tsx`**, **`EmbeddedChatView.tsx`**, **`FloatingChat.tsx`**: Remove ALL preliminary disagreement step code (`preliminaryDisagreement`, `preliminaryDone`, `hasNeverRated`, `showPreliminaryStep`, the overlay UI). Chat opens directly to messaging.

#### 6e. Node info panel — disagreement slider

**`src/pages/Index.tsx`**: Add disagreement slider (0-100) below the opinion text in the node action panel. Visible for all opinions except user's own. Auto-saves via `useOpinionRating` (debounced). Any user can rate any opinion's disagreement without a chat.

#### 6f. `useTopicData.ts`

Fetch `opinion_ratings` + realtime listener for graph refetch on changes.

### 7. Layout Data Flow

```text
opinion_ratings.disagreement → angular separation between nodes
chat_ratings.empathy × opinion_ratings.disagreement → FreeMind score → radial level
```

`freemind-layout.ts` accepts `OpinionRating[]` for angles and combines both sources for bridging scores.

---

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Welcome popup, inline CTA, disagreement slider in node panel |
| `src/lib/freemind-layout.ts` | Discrete 10-level system, drop inactive logic, use opinion_ratings for angles |
| `src/types/graph.ts` | Clean stale comments, add `OpinionRating` type |
| `src/themes/tokenizer.ts` | Remove inactive fallback |
| `src/themes/signal/SignalZones.tsx` | Remove inactive zone, fix stale comments |
| `src/themes/signal/SignalNode.tsx` | Remove InactiveShape |
| `src/themes/city/CityZones.tsx` | Remove inactive zone |
| `src/themes/arcane/ArcaneZones.tsx` | Remove inactive zone |
| `src/components/graph/OpinionGraph.tsx` | Update config if needed |
| `src/components/chat/RatingSliders.tsx` | Empathy-only (remove disagreement) |
| `src/components/chat/FloatingChatWindow.tsx` | Remove preliminary step |
| `src/components/chat/EmbeddedChatView.tsx` | Remove preliminary step |
| `src/components/chat/FloatingChat.tsx` | Remove preliminary step |
| `src/hooks/useOpinionRating.ts` | **New** — standalone disagreement CRUD |
| `src/hooks/useTopicData.ts` | Fetch opinion_ratings, realtime listener |
| `src/i18n/locales/en.json` | Welcome text, disagreement keys |
| `src/i18n/locales/de.json` | Same |
| **DB Migration** | `opinion_ratings` table + RLS + update `get_graph_pairs` RPC |
