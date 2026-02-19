
# Sharpen Graph Layout + Remove Top-5 Cap + Comment Out "Suitable For"

## 1. Remove the Top-5 Green Zone Cap

Currently, only 5 nodes with the highest bridging scores are placed in the green/core zone using fixed pentagon positions. This will be removed so that **any node with a qualifying score (> 2500) is placed in the core zone** using the same linear radius mapping as other nodes.

### Changes in `src/lib/freemind-layout.ts`:
- Remove `MAX_GREEN_ZONE_NODES` constant
- Remove `calculateGreenZoneSlotPositions()` function
- Remove the `bridgeNodes` top-5 selection logic (lines 472-491)
- Remove the `top5NodeIds` set and the `isTop5` branch in node positioning (lines 529-539)
- All qualifying nodes now go through `scoreToRadius()` + angle-based positioning like every other active node
- Mark nodes with `zone: 'green'` based on `isBridgeNode(score)` instead of `isTop5`
- `greenZoneSlots` array will be returned empty (to keep the interface stable)

### Changes in `src/themes/tokenizer.ts`:
- Remove the `tokenizeNodesWithCoreCap()` function entirely
- Update any callers to use the regular `tokenizeNode()` for all nodes (no more core-cap override)

### Changes in renderers that call `tokenizeNodesWithCoreCap`:
- `CityRenderer.tsx`, `ArcaneRenderer.tsx`, `SignalRenderer.tsx` -- switch to mapping all nodes through `tokenizeNode()` directly

## 2. Zone Border Snapping (Keep Linear Mapping)

The linear `scoreToRadius()` mapping stays, but nodes that land on a zone border get nudged fully into one zone. The rule: if more than 50% of the node's diameter is in a zone, snap fully into that zone.

### Changes in `src/lib/freemind-layout.ts` -- `scoreToRadius()`:
- After computing the linear radius, check proximity to each zone boundary (`greenRadius`, `yellowRadius`, `pinkRadius`)
- If the node center is within `nodeRadius` (one node-radius = half the node diameter) of a boundary, snap it:
  - If center is inside the inner zone (closer to center than boundary), push it inward by `nodeRadius + small padding`
  - If center is outside, push it outward by `nodeRadius + small padding`
- This ensures no node visually straddles a zone border

```text
boundaries = [greenRadius, yellowRadius, pinkRadius]
for each boundary:
  if abs(radius - boundary) < nodeRadius:
    if radius < boundary:
      radius = boundary - nodeRadius - 2px padding
    else:
      radius = boundary + nodeRadius + 2px padding
```

## 3. Comment Out "Suitable For" Section

In `src/pages/Landing.tsx`, wrap lines 257-286 (the "Geeignet fur" section) in a JSX block comment `{/* ... */}` so it's hidden but easily restorable.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/freemind-layout.ts` | Remove top-5 cap, add zone-border snapping to `scoreToRadius()` |
| `src/themes/tokenizer.ts` | Remove `tokenizeNodesWithCoreCap()` |
| `src/themes/city/CityRenderer.tsx` | Use `tokenizeNode()` instead of `tokenizeNodesWithCoreCap()` |
| `src/themes/arcane/ArcaneRenderer.tsx` | Use `tokenizeNode()` instead of `tokenizeNodesWithCoreCap()` |
| `src/themes/signal/SignalRenderer.tsx` | Use `tokenizeNode()` instead of `tokenizeNodesWithCoreCap()` |
| `src/pages/Landing.tsx` | Comment out "Suitable For" section |
