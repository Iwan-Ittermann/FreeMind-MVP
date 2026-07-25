## Problem

In `src/lib/tt-layout.ts` the extreme band is tiered:

```text
tier -1 (0..-1000)      → extremeOuter
tier -2 (-1001..-2500)  → extremeOuter - 0.4 * band
tier -3 (< -2500)       → extremeOuter - 0.8 * band
```

So a node at −1250 (tier −2) sits noticeably closer to center than a node at −300 (tier −1). That inverts what the user wants and is what they observed.

Positive ranking already correctly excludes negatives (`filter(t.total > 0)` in `positives`), so no change is needed there.

## Fix

Collapse the extreme band to a single radius equal to `maxVisibleR` — the same "outer thin line" that starter nodes sit on. All negative-point nodes line up on that ring; the collision resolver + deterministic angles keep them from stacking.

- Delete the tier math (`extremeOuter`, `extremeInner`, `bandSteps`, `tierFrac`, `hashId`, `extremeRadius`).
- In the per-node mapping, when `total < 0`, set `r = maxVisibleR` and keep `level = -1 | -2 | -3` (still useful for styling/labels), `zone = 'extreme'`.
- Positive-band and starter placement stay unchanged.

## File

- `src/lib/tt-layout.ts` — simplify the extreme branch as above.

## Verification

Playwright at 393×852 on `/7mm9`: screenshot idle graph and confirm the three synthetic negative-score nodes (currently −300, −1250, and any other) all sit on the outer visible ring, not staggered inward.