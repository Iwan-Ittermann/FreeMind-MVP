# Fix: tied nodes stack at center

## Root cause
In `src/lib/tt-layout.ts`, when all positive-score nodes are tied (`groupCount <= 1`), every node is placed at `r = 0`. `resolveCollisions` only adjusts *angles*, so at radius 0 every angle maps to the same point — angular pushes can't separate them, and they stack on top of each other at the exact center.

The same weakness applies at very small radii even when `groupCount > 1`: an angular push of Δθ at r≈0 moves a node by ~r·Δθ, i.e. almost nothing.

## Fix
In `calculateTTLayout`, positive-band branch:

1. When `groupCount <= 1` **and** there is more than one tied top node, place them on a small shared orbit (reuse the existing `topOrbitRadius` value, which is already computed for exactly this purpose — currently unused). Single node stays at `r = 0`.
2. When `groupCount > 1` but the group falls at fractional radius 0 (top group with >1 node), also use `topOrbitRadius` so top-tied nodes get a visible micro-orbit instead of stacking.

Concretely, replace the current:
```ts
if (groupCount <= 1) {
  r = 0;
} else {
  const frac = gi / (groupCount - 1);
  r = frac * (blueR - tinyPad);
}
```
with:
```ts
const frac = groupCount <= 1 ? 0 : gi / (groupCount - 1);
const baseR = frac * (blueR - tinyPad);
// Give the top-tied cohort a tiny orbit so the angular collision resolver
// can actually separate them (angular push at r=0 has no effect).
const isTopGroup = gi === 0;
r = isTopGroup && topIds.length > 1 ? Math.max(baseR, topOrbitRadius) : baseR;
```

`topOrbitRadius` is already `Math.min(coreR * 0.18, 18)` when there are ties at the top — enough to make angular separation visible while still reading as "at the center".

Deterministic: same inputs → same `topIds`, same radius, same angles from `calculateDeterministicAngles`, same collision pass.

## Out of scope
- No change to angle assignment, collision resolver, extreme band, or non-tied nodes.
- No visual/styling changes.
