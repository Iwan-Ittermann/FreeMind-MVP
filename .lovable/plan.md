Plan

1. Fix the Fake Nodes admin tab so newly added topics are usable

- Update the Fake Nodes panel behavior so every active topic is visible in the tab, even if it currently has zero fake nodes.
- Keep the per-topic fake-node list, create/edit/delete controls, and visibility toggle.
- Improve the collapsed empty-state text so a new topic shows something like “Add fake nodes” instead of being hidden or showing “Show 0 fake nodes”.
- Keep using the existing `useAllTopics(true)` source, so new topics appear after the existing topic query is invalidated by topic creation.

2. Verify and, if needed, repair fake-node graph integration

- The current fake-node admin table stores `fake_nodes`, while the graph reads visible graph nodes from `opinions_public` and only uses `fake_nodes` to identify which opinions are fake by matching text.
- I will check the current runtime behavior while implementing. If creating a fake node currently only writes to `fake_nodes` and does not create a corresponding graph opinion, I will add the missing safe bridge so fake nodes actually appear on the selected topic’s graph.
- Preferred approach: make `useCreateFakeNode`, `useUpdateFakeNode`, and `useDeleteFakeNode` keep the fake-node record and its matching graph opinion in sync, using the existing bot/fake system conventions and without changing IP handling.
- If a backend migration/RPC is needed for reliable admin-only syncing, I will add it with RLS-safe admin checks.

3. Add spectral clustering based only on disagreement patterns

- Add a deterministic clustering module for graph data that uses only opinion-to-opinion disagreement values, never node x/y position.
- Input will be the existing `opinions` and merged `ratings` data after `opinion_ratings` have overridden disagreement, so clustering follows the same disagreement source used for angular layout.
- Build an affinity matrix from disagreement similarity. Conceptually:

```text
high similarity = two nodes have low direct disagreement
or have similar disagreement profiles toward the rest of the graph
position on screen is ignored completely
```

- Compute the normalized graph Laplacian and use eigengap to choose the number of clusters within safe bounds, for example:
  - no clustering for fewer than 3 meaningful connected nodes
  - cap cluster count to a small number, likely 6, to avoid noisy color overload
  - ignore singleton clusters visually unless needed for node coloring
- Implement a small in-app numeric routine rather than adding a heavy dependency, unless an existing lightweight dependency is already suitable. The expected node counts are small enough for this.

4. Attach cluster identity to nodes in both graph layouts

- Update `calculateLayout()` and `calculateTTLayout()` so each returned `GraphNode` gets `cluster` from spectral clustering.
- This keeps regular graph routes and the `/` mobile/TT UI consistent.
- Collision resolution and layout positioning will remain unchanged; clustering only affects color/background rendering.

5. Render cluster colors on nodes

- Extend the semantic token layer to expose a deterministic cluster color or cluster index.
- In the Signal theme, update node rendering so nodes in the same cluster share the same visible color while preserving important overrides:
  - current user remains clearly identifiable
  - bot remains distinguishable
  - selected/highlighted states still work
  - hidden/moderation state remains dimmed
- &nbsp;

7. Safety and edge cases

- If there are too few ratings, no reliable eigengap, or the graph is mostly disconnected, fall back to no cluster fill or one neutral cluster rather than inventing misleading groups.
- Clustering will be deterministic: stable opinion ordering by ID and stable tie-breaking.
- Position data will not be read by the clustering algorithm.
- The visual fills will be subtle enough not to obscure zone rings, node labels, pending requests, or selected states.

Files likely to change

- `src/components/admin/FakeNodesPanel.tsx`
- `src/hooks/useFakeNodes.ts`
- `src/hooks/useTopicData.ts` if fake-node/opinion syncing needs frontend repair
- `src/lib/freemind-layout.ts`
- `src/lib/tt-layout.ts`
- new helper such as `src/lib/spectral-clustering.ts`
- `src/types/graph.ts`
- `src/themes/tokenizer.ts`
- `src/themes/types.ts`
- `src/themes/signal/SignalRenderer.tsx`
- `src/themes/signal/SignalNode.tsx`
- new `src/themes/signal/SignalCluster.tsx`
- possibly `src/themes/city/CityCluster.tsx` and `src/themes/arcane/ArcaneCluster.tsx` for palette alignment

Database/backend note

- The “all topics appear” part should be frontend-only.
- If fake nodes do not currently become actual graph opinions for newly selected topics, I will add the smallest safe backend or client-side sync needed. Any database change will use the migration workflow and existing admin-role protection.