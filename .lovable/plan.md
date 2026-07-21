## Goals

1. **Header + footer same slim size** — header only takes space needed by its 8×8 icon row; footer matches that height. Topic stays exactly in the middle between upper frontier of graph and lower frontier of header. 
2. **New radial layout: proximity = total points** — the total (sum, not average) of chat bridging scores decides how close a node sits to the center. The top-scoring node anchors the exact center; every other positive-score node is placed proportionally between the center and the outer positive band. Angles are unchanged and the whole layout stays deterministic.
3. **Show each node's point total** — a tiny count label sits just next to every node.

---

## 1. Header + footer sizing (`src/components/tt/TTHeader.tsx`, `src/pages/EineWocheEineFrage.tsx`)

- Header: change `pt-3` + `pb-2` wrapper to a tight `py-1.5` row. Icon buttons shrink from `h-8 w-8` to `h-7 w-7`. Remove the extra bottom padding; keep the thin `border-b border-border/30`. Effective header height ≈ 32–34 px.
- Footer (Impressum link in `EineWocheEineFrage.tsx`): match the header — `h-7` flex row, thin top border `border-t border-border/30`, `text-[11px]` link, no extra margin. Both header and footer are now the same visual weight and height.
- Topic-question container: replace the hardcoded `top: 52` with `top: 36` (new header bottom) and keep the `bottom: calc(50% + min(42.5vw, 204px) + 8px)` guard so it never overlaps the graph.

## 2. Layout: total points → radius (`src/lib/tt-layout.ts` only — TT / event build)

TT is the layout the user sees at `/7mm9`. The generic `freemind-layout.ts` is left alone.

Radial rules (positive scores):

```
totalPoints(node)  = Σ (empathy × disagreement) over that node's non-synthetic chat ratings
maxTotal           = max(totalPoints across all opinions, 1)   // 1 guards div-by-zero
r(node)            = blueR × (1 − totalPoints / maxTotal)      // top scorer → 0, score 0 → blueR
```

- Top-scoring node sits exactly at center (r=0). Multi-tie at top uses the existing tiny-inner-orbit fallback (`level10Radius`) so ties don't overlap.
- Nodes with `hasChats === false` (starter, no ratings yet) keep the existing starter placement near the blue ring edge (`blueR − tinyPad`) — behavior identical to today.
- Nodes with negative totals keep today's extreme-band behavior (`whiteR + step`, `whiteR + step + EXTREME_STEP`, `+ 2×EXTREME_STEP`) — nothing about the extreme zone changes.
- Bot node pinning at 6 o'clock and the collision-resolver pass are unchanged.

Determinism preserved:

- Angles come from the untouched `calculateDeterministicAngles` (same anchor pair by sorted disagreement, same id-sorted tiebreakers).
- `maxTotal` is computed from a deterministic sum; ties for "who is the top scorer" are broken by lowest `opinion.id` so the center anchor is stable.
- Collision resolver already sorts by id and pushes only angularly.

The old level-based radii (`ttLevelToRadius` levels 1–10, `ttScoreToLevel`) become obsolete for positive scores; they stay in the file only as a fallback for negative levels and for `getTTLevelRadii` guide rings (which no other renderer actually reads for TT — verified in a follow-up grep during build).

Data plumbed through `GraphNode`:

- Extend the node with `totalPoints: number` (and keep `distanceToCenter` for existing readers).
- Tokenizer already carries `bridgingScore` on `SemanticNodeToken` — reuse that field to pass `totalPoints` through to the renderer (rename intent in a code comment, no type change needed).

## 3. Point count label on each node (`src/themes/signal/SignalNode.tsx`)

- Add a tiny SVG `<text>` next to the node, offset to the lower-right of the shape (e.g. `x = scaledHalf + 3`, `y = scaledHalf − 1`), `fontSize={9}`, muted foreground fill, subtle stroke for legibility over the background.
- Rounded display: `Math.round(totalPoints)`. Nodes with `totalPoints === 0` and no chats show nothing (keeps starter nodes clean). Negative totals are shown with the sign so users understand why a node is in the extreme band.
- Bot node: no count.

## Technical details

- Files touched: `src/lib/tt-layout.ts`, `src/types/graph.ts` (add optional `totalPoints`), `src/themes/tokenizer.ts` (populate `bridgingScore` from `totalPoints`), `src/themes/signal/SignalNode.tsx`, `src/components/tt/TTHeader.tsx`, `src/pages/EineWocheEineFrage.tsx`.
- No DB or edge-function changes. No RLS impact.
- Determinism check I will re-run mentally after coding: for the same `(opinions, ratings)` input, `totalPoints` map is pure; `maxTotal` is a `Math.max` over a sorted-by-id iteration; radii are pure functions of the map; angles use existing deterministic path; collision resolver already deterministic. ✅

## Open question (small)

The user said "highest in center, others in relation to it". The plan reads that as **linear proportional** (top → r=0, score 0 → r=blueR). If they meant a different curve (e.g. sqrt to spread mid-range nodes out more), that's a one-line tweak later.