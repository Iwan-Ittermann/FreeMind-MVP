# Rebuild the graph as an eye

Correct the radial anatomy while keeping the approved dark page background and deterministic node layout.

## Visual structure

From the centre outward:

1. **Pupil — dark orange**
   - A compact, crisp dark-orange centre with subtle amber variation.
   - No blue or pale color inside the pupil.

2. **Iris — dark to electric blue**
   - The main positive-score area starts deep navy immediately outside the pupil and transitions through saturated/electric blue.
   - Most of the iris remains dark or vivid blue; light blue is not spread across it.

3. **Zero-point ring — light blue only**
   - A narrow light-blue annulus at the iris’s outer boundary.
   - It aligns exactly with the existing deterministic radius used by zero-point nodes, making that score state visually explicit.

4. **Sclera — broad white surround**
   - Replace the current hairline white outline with a clearly visible white band outside the light-blue ring.
   - The white sclera ends cleanly against the existing faded-blue page background.

```text
[dark orange pupil] → [deep/electric blue iris] → [thin light-blue zero ring] → [broad white sclera] → [dark page]
```

## Technical details

- Rebuild `TTBackground.tsx` as separate concentric layers rather than one full-disc gradient:
  - pupil to the existing `coreR` landmark,
  - blue iris to `blueR`, with light blue confined to its outermost stops,
  - white sclera from `blueR` to `whiteR`.
- Align the SVG radii with the graph’s current landmark conversion in `TTScreen.tsx` (`coreR 140`, `blueR 300`, `whiteR 360` in the 1000-unit background coordinate system).
- Keep `tt-layout.ts` score mapping, deterministic angles, collision handling, node sizes, and point logic unchanged. Zero-point nodes already sit at `blueR - 4`, so the artwork will be corrected around their existing position.
- Remove blur that causes blue to bleed into the sclera; use only restrained edge softness inside the iris.
- Keep the current dark faded-blue full-screen background, header, title, controls, and node styling unchanged.

## Preview check

Capture `/test` in the mobile UI and verify visually that:
- light blue appears only beneath the zero-point nodes,
- a substantial white sclera is visible outside them,
- the pupil is compact and dark orange,
- the remaining iris reads dark navy to electric blue,
- no graph coordinates or node positions changed.
