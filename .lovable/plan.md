

## Plan: Fix Arcane Node Transparent Rectangles

### Problem
The nested `<svg>` element used to crop sprite sheets in `ArcaneNode.tsx` (line 80-89) creates a visible rectangular viewport boundary. Even with `overflow="hidden"`, the `<svg>` element itself is a block-level container that shows as a rectangle on the graph.

### Fix
Replace the nested `<svg>` + `<image>` pattern with a `<g>` + `<clipPath>` + `<image>` approach. This clips the sprite to the correct cell without creating a rectangular viewport element.

**File: `src/themes/arcane/ArcaneNode.tsx`**

Replace lines 79-89:
```tsx
{/* Sprite-sheet cropped building */}
<clipPath id={`arcane-clip-${token.id}`}>
  <rect x={-HALF} y={-HALF} width={NODE_SIZE} height={NODE_SIZE} />
</clipPath>
<g clipPath={`url(#arcane-clip-${token.id})`}>
  <image
    href={spriteUrl}
    x={-HALF - vx * (NODE_SIZE / GRID)}
    y={-HALF - vy * (NODE_SIZE / GRID)}
    width={1024 * (NODE_SIZE / GRID)}
    height={1024 * (NODE_SIZE / GRID)}
  />
</g>
```

This scales the full sprite sheet so each cell is exactly `NODE_SIZE` pixels, positions it so the correct cell aligns within the clip rect, and clips away the rest — no rectangular background artifact.

### Files
| File | Change |
|------|--------|
| `src/themes/arcane/ArcaneNode.tsx` | Replace nested `<svg>` with `<clipPath>` + `<image>` |

