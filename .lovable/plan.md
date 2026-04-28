Revised plan

Scope correction
- I will leave City, Arcane, and the old/classic graph themes untouched.
- Spectral clustering visualization will be implemented only for the Signal graph used on `/` and topic short-code routes like `/8nv5`.
- Admin fake-node fixes still apply to the admin dashboard because that is separate from theme rendering.

1. Fix the Fake Nodes admin tab
- Make every active topic appear in the Fake Nodes tab, including newly created topics with zero fake nodes.
- Remove the current behavior where topics with no fake nodes disappear while collapsed.
- Keep each topic section collapsible, but show an empty-state/action label such as “Add fake nodes” for topics with none.
- Keep create/edit/delete and the per-topic fake-node visibility toggle.

2. Ensure fake nodes work for newly added topics
- Verify whether creating a fake node currently creates only a `fake_nodes` row or also creates a visible graph opinion.
- If fake nodes do not appear on the graph for new topics, add the smallest safe fix so fake-node records and graph opinions stay in sync.
- Keep this admin-only and compatible with the existing passphrase/admin-role setup.

3. Add disagreement-only spectral clustering for `/`
- Add a deterministic clustering helper that uses only disagreement relationships/patterns.
- It will not use graph position, radius, angle, x/y coordinates, or rendered node distance.
- Input: the same merged disagreement data already used by the graph, after standalone `opinion_ratings` have overridden/filled disagreement values.

Conceptually:

```text
opinions + pairwise disagreement ratings
        ↓
disagreement similarity matrix
        ↓
normalized graph Laplacian
        ↓
eigengap chooses cluster count
        ↓
cluster id assigned to each node
        ↓
Signal-only colors + soft background fields on `/`
```

4. Cluster-count logic with eigengap
- Use eigengap to choose the number of clusters within safe visual bounds.
- Use conservative fallbacks:
  - fewer than 3 connected/rated nodes: no clustering visualization
  - unclear eigengap: no or minimal clustering rather than misleading groups
  - cap cluster count, likely around 6, to avoid too many colors
- Keep deterministic tie-breaking by sorted opinion IDs.

5. Apply clusters only in the TT/Signal layout path
- Attach computed `cluster` ids only where `/` uses the Signal renderer path, most likely via `calculateTTLayout()`.
- I will avoid changing City/Arcane/classic rendering behavior.
- If `calculateLayout()` needs a shared helper import for types only, it will not render clusters in other themes.

6. Signal-only node coloring on `/`
- Update `SignalNode` so nodes in the same spectral cluster share a color.
- Preserve existing important overrides:
  - current user remains clearly identifiable
  - AI bot remains distinguishable
  - selected/highlighted state remains visible
  - hidden/moderated nodes remain dimmed
  - zone shape logic can remain, but color will reflect cluster membership where appropriate

7. Signal-only soft cluster backgrounds on `/`
- Add a new Signal-only background layer rendered behind edges and nodes.
- Group nodes by `clusterId` and draw a transparent, subtle, soft-edged fill around each cluster.
- The fill color will match the cluster’s node color at low opacity.
- The background shape will be based on the current rendered positions only for drawing the visual hull/fill around already-clustered nodes, not for detecting the clusters.
- It will not affect clicks or interactions.

8. Files likely to change
- `src/components/admin/FakeNodesPanel.tsx`
- `src/hooks/useFakeNodes.ts` if fake-node/opinion syncing needs repair
- possibly `src/hooks/useTopicData.ts` if fake-node identification needs hardening
- new `src/lib/spectral-clustering.ts`
- `src/lib/tt-layout.ts`
- `src/types/graph.ts`
- `src/themes/tokenizer.ts`
- `src/themes/types.ts`
- `src/themes/signal/SignalRenderer.tsx`
- `src/themes/signal/SignalNode.tsx`
- new `src/themes/signal/SignalCluster.tsx`

Not in scope
- No City theme cluster changes.
- No Arcane theme cluster changes.
- No classic graph cluster changes.
- No clustering based on graph position.
- No broad visual redesign outside `/`.