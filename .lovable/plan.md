

## Investigation

The user is correct: the three "respectful" (star) nodes are rendering below-right of the iris center, not at the visual center.

### Root cause

In `TTScreen.tsx`:
```tsx
<OpinionGraph width={480} height={480} ... />
```
The graph is rendered at a **fixed 480×480** SVG viewport. But the wrapper around it is sized responsively:
```tsx
style={{ width: 'min(85vmin, 480px)', height: 'min(85vmin, 480px)' }}
```

On a 390×844 viewport: `85vmin = 0.85 × 390 = 331px`. So the wrapper is **331×331**, but the SVG inside is **480×480**, anchored at top-left of the wrapper. The SVG's internal center (240, 240) lands well below and right of the wrapper's visual center (165, 165) — exactly the offset the user sees.

The iris background uses `preserveAspectRatio` and scales to the wrapper, so it stays centered. The graph SVG does not — it renders at literal 480px, overflowing down-right.

### Fix

Make the graph size match the wrapper size dynamically. Two clean options:

**Option A (minimal)**: Measure the wrapper with a ref + `ResizeObserver`, pass measured `width`/`height` to `OpinionGraph`. The internal layout config already derives radii from `Math.min(width, height)`, so this just works.

**Option B (CSS-only)**: Wrap the SVG in a `viewBox="0 0 480 480"` + `width="100%" height="100%"` so it scales. But `OpinionGraph` builds the `<svg>` itself with hardcoded `width`/`height` and no viewBox — would require touching `OpinionGraph` too.

Option A is safer and localized to `TTScreen.tsx`. No changes to shared graph code.

### Plan

**File**: `src/components/tt/TTScreen.tsx`

1. Add a `ref` on the inner square wrapper.
2. Use a small `useResizeObserver` (or inline `useEffect` + `ResizeObserver`) to track its actual rendered pixel size.
3. Pass that size as `width`/`height` to `<OpinionGraph>`.
4. Initial fallback: 480 (so first paint isn't broken before observer fires) — or 0 with a `null` guard to avoid a flash of misaligned nodes. Prefer the guard.

That's it. No other files affected.

### Out of scope
- Changing OpinionGraph to be intrinsically responsive (would benefit other routes too, but riskier — defer).
- Parallax (already removed).

