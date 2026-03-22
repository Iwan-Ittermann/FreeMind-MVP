

## Revised Plan: Two Additions

### Addition A: Zone Naming Convention Enforcement

Rename all internal code references from color-based to semantic names:

| Old Name | New Name | Config Field |
|----------|----------|-------------|
| `greenRadius` | `respectfulRadius` | `LayoutConfig.respectfulRadius` |
| `yellowRadius` | `moderateRadius` | `LayoutConfig.moderateRadius` |
| `pinkRadius` | `extremeRadius` | `LayoutConfig.extremeRadius` |
| `zone: 'green'` | `zone: 'respectful'` | `GraphNode.zone` |
| `zone: 'yellow'` | `zone: 'moderate'` | - |
| `zone: 'pink'` | `zone: 'extreme'` | - |
| `GreenZoneSlot` | `RespectfulZoneSlot` | type name |

**Files affected** (based on search — 11 files with 273 references):
- `src/types/graph.ts` — rename fields and type literals
- `src/lib/freemind-layout.ts` — all radius references, comments, zone logic
- `src/themes/tokenizer.ts` — `resolveZone` returns, zone token construction
- `src/components/graph/OpinionGraph.tsx` — config construction
- `src/themes/signal/SignalZones.tsx`, `SignalNode.tsx`, `SignalRenderer.tsx`
- `src/themes/city/CityZones.tsx`, `CityNode.tsx`, `CityRenderer.tsx`
- `src/themes/arcane/ArcaneZones.tsx`, `ArcaneNode.tsx`, `ArcaneRenderer.tsx`
- `src/components/graph/GreenZoneSlots.tsx` → rename or remove
- `src/components/graph/ConcentricCircles.tsx`

Comments in `freemind-layout.ts` will also be updated to use "respectful zone", "moderate zone", "extreme zone" instead of color names.

---

### Addition B: Clean Rating Architecture

**Goal**: Disagreement lives only in `opinion_ratings`, empathy lives only in `chat_ratings`. No more disagreement slider in chat.

**Cleanest approach — single responsibility per table**:

```text
opinion_ratings table → disagreement (0-100)
   - Any user can rate any opinion's disagreement
   - Drives angular separation between nodes

chat_ratings table → empathy only (-50 to +50)
   - Chat participants rate empathy during/after conversation
   - Drop the disagreement column (or stop using it)

FreeMind Score (radial position) = empathy × disagreement
   - For each pair (A,B):
     empathy = avg from chat_ratings (default 0 if no chat)
     disagreement = avg from opinion_ratings (default 50 if unrated)
     bridging_score = empathy × disagreement
   - Node's FreeMind Score = average of all pair bridging scores
```

This is clean because:
- Each concept has one source of truth
- No data duplication between tables
- The existing `calculateBridgingScore(empathy, disagreement)` function stays the same
- Only the data source changes: disagreement comes from `opinion_ratings` instead of `chat_ratings`

**Implementation**:

1. **DB Migration**: Create `opinion_ratings` table (as in previous plan). No need to drop the `disagreement` column from `chat_ratings` immediately — just stop writing to it.

2. **Update `get_graph_pairs` RPC**: Join `opinion_ratings` for disagreement and `chat_ratings` for empathy. Return both separately so the layout algorithm can combine them.

3. **`useTopicData.ts`**: Fetch opinion_ratings alongside chat data. Pass both to the layout algorithm.

4. **`freemind-layout.ts`**: Accept two data sources — `ChatRating[]` (empathy only) and `OpinionRating[]` (disagreement only). Compute bridging scores by combining matching pairs.

5. **Chat UI**: Remove all disagreement sliders from `RatingSliders.tsx`, `FloatingChatWindow.tsx`, `EmbeddedChatView.tsx`. Chat rating becomes empathy-only.

6. **Node info panel** (`Index.tsx`): Show disagreement slider for any opinion (not just chat partners).

---

### Combined Files to Change (full plan including previous 9 items + these additions)

| File | Change |
|------|--------|
| `src/types/graph.ts` | Rename zone types and config fields to semantic names; add `OpinionRating` type |
| `src/lib/freemind-layout.ts` | Rename all radius/zone refs; accept separate empathy+disagreement sources; discrete levels |
| `src/themes/tokenizer.ts` | Update zone names in `resolveZone` and token construction |
| `src/components/graph/OpinionGraph.tsx` | Rename config fields |
| `src/themes/signal/*` | Zone name updates |
| `src/themes/city/*` | Zone name updates |
| `src/themes/arcane/*` | Zone name updates |
| `src/components/graph/ConcentricCircles.tsx` | Rename fields |
| `src/components/graph/GreenZoneSlots.tsx` | Rename to RespectfulZoneSlots or remove |
| `src/components/chat/RatingSliders.tsx` | Remove disagreement slider, empathy only |
| `src/components/chat/FloatingChatWindow.tsx` | Remove disagreement from chat rating |
| `src/components/chat/EmbeddedChatView.tsx` | Remove preliminary disagreement step |
| `src/components/chat/FloatingChat.tsx` | Same |
| `src/hooks/useOpinionRating.ts` | **New** — standalone disagreement rating |
| `src/hooks/useTopicData.ts` | Fetch opinion_ratings, pass to layout |
| `src/pages/Index.tsx` | Welcome popup, inline CTA, disagreement in info panel, title, login CTA |
| `src/components/MainMenu.tsx` | Width constraint, hideClose |
| `src/components/AboutSidebar.tsx` | Width constraint, title |
| `src/components/ui/sheet.tsx` | hideClose prop |
| `src/components/chat/ChatBubble.tsx` | Fix colors |
| `src/themes/signal/SignalNode.tsx` | Unread badge fix |
| `src/i18n/locales/en.json` | New keys |
| `src/i18n/locales/de.json` | New keys |
| `cluster-visualization-analysis.txt` | New doc |
| `debug-chat-animation-investigation.txt` | Update |
| **DB Migration** | Create `opinion_ratings` table + RLS |

