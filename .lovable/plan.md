
# FreeMind City Metaphor Layer -- Implementation Plan

## Overview
Add a city-metaphor visual layer to the existing FreeMind graph. When users visit via `freemind.city`, they see the city theme; via `freemind.chat`, they see the classic graph. Both share the same backend, layout engine, and data.

---

## Architecture

The implementation follows the three-layer separation from the spec, but within the existing single-app Vite codebase.

```text
src/
  themes/
    types.ts              -- Layer B: Semantic token interfaces
    tokenizer.ts          -- Layer B: GraphNode/Edge -> SemanticToken mapper
    ThemeContext.tsx       -- Theme provider (domain detection)
    classic/
      ClassicRenderer.tsx -- Wraps existing OpinionGraph (Layer C - classic)
    city/
      CityRenderer.tsx    -- Layer C: City theme entry point
      CityZones.tsx       -- Concentric zone backgrounds (marketplace, quarters, periphery, meadow)
      CityNode.tsx        -- House/tent SVG rendering per node token
      CityEdge.tsx        -- Road rendering per edge token
      CityEventMarker.tsx -- Light pulse animations for events
      CityCluster.tsx     -- Soft cluster background fields
      house-shapes.ts     -- Inline SVG house generators (pastel isometric style)
```

---

## Phase 1: Semantic Token Layer (Layer B)

Create a strict TypeScript interface that translates raw graph data into normalized tokens. This is a pure function layer with no visual decisions.

**New file: `src/themes/types.ts`**
- `SemanticNodeToken`: zone, activityLevel, heightFactor, radius, bridgingScore, clusterId, nodeRole, isOnline, hasUnread, etc.
- `SemanticEdgeToken`: respectLevel, length, edgeRole, isActive, isPending
- `SemanticEventToken`: eventType (cluster-bridge, respect-threshold, zone-entry, rating-complete)
- `ThemeRenderer` interface: renderZone, renderNode, renderEdge, renderEvent

**New file: `src/themes/tokenizer.ts`**
- `tokenizeNode(node: GraphNode, config: LayoutConfig) -> SemanticNodeToken`
- `tokenizeEdge(edge: GraphEdge, nodes: GraphNode[]) -> SemanticEdgeToken`
- Pure functions, deterministic, read-only over graph data

---

## Phase 2: Theme Context and Domain Detection

**New file: `src/themes/ThemeContext.tsx`**
- Detects hostname at startup
- `freemind.city` or `localhost` with `?theme=city` -> CityTheme
- Everything else -> ClassicTheme
- Exposes `useTheme()` hook returning current theme name
- No runtime theme editing in production (per spec)

**Modified: `src/components/graph/OpinionGraph.tsx`** (or a new wrapper)
- When theme is "city", render `CityRenderer` instead of existing SVG components
- When theme is "classic", render existing components unchanged
- All interaction handlers (click, hover) remain centralized in `OpinionGraph`

---

## Phase 3: City Theme Renderer (Layer C)

### 3a. Zone Rendering (`CityZones.tsx`)
- Core/green zone -> Marketplace: pastel green fill, subtle grid pattern
- Middle/yellow -> Quarters: warm pastel fill, faint block pattern
- Outer/pink -> Periphery: muted red-pink, sparse texture
- Beyond boundary -> Meadow: soft green gradient fading out
- Concentric rings rendered as SVG circles with themed fills

### 3b. Node Rendering (`CityNode.tsx` + `house-shapes.ts`)
- Each node token mapped to a house SVG:
  - **Core zone**: Larger public buildings (wider base, taller, flag/detail on top)
  - **Middle zone**: Medium residential houses (pitched roof, windows, chimney)
  - **Outer zone**: Small fragmented houses (narrow, fewer details)
  - **Inactive**: Small tent/triangle shape
- Size driven by `activityLevel`, height by `heightFactor`
- Color derived from cluster mapping (pastel palette)
- Current user's house has a distinct accent (glow or banner)
- Online indicator: small green lamp in window
- Unread badge: small envelope icon above roof
- Houses rendered above roads (z-index via SVG ordering)

### 3c. Edge Rendering (`CityEdge.tsx`)
- Chat connections rendered as roads (wider strokes, slight texture via stroke pattern)
- Width: constant base width
- Color/opacity derived from `respectLevel`
- Pending roads: dashed/cobblestone pattern
- Active roads: subtle warm glow
- Rendered before nodes in SVG (beneath houses)

### 3d. Event Markers (`CityEventMarker.tsx`)
- Small light orb that travels along a road once
- Triggered by: first cluster connection, respect threshold, zone entry, rating completion
- Duration: 1-2 seconds, then fade
- Max 1-2 simultaneous per edge, overflow queued
- No continuous or ambient animation

### 3e. Cluster Visualization (`CityCluster.tsx`)
- Soft pastel background fields behind groups of houses
- Derived from polar angle grouping
- Updates only on significant cluster changes
- No hard borders, gradient edges

---

## Phase 4: Interaction Handling

All click/hover logic stays centralized in `OpinionGraph.tsx` (or a shared handler). The city renderer dispatches the same semantic interaction events:
- Node click -> opinion actions panel (same as classic)
- Node hover -> highlight house + connected roads
- Edge click -> chat view
- Pointer priority: nodes over edges (SVG render order)

No inline business logic in CityNode or CityEdge components.

---

## Phase 5: Domain Setup

- Connect `freemind.city` as a custom domain in Lovable project settings (Settings -> Domains)
- Both domains serve the same deployed app
- Theme detection happens client-side via `window.location.hostname`

---

## What Does NOT Change
- Layout algorithm (`freemind-layout.ts`) -- untouched
- Data layer (all hooks, Supabase queries) -- untouched
- Chat, ratings, moderation, admin -- untouched
- Classic theme rendering -- untouched (just wrapped)
- Backend/database -- no changes needed

---

## Technical Notes

- All SVG house shapes are generated inline via TypeScript functions (no external asset files). They use simple geometric primitives (rect, polygon, circle) styled with pastel colors to match the Freepik reference aesthetic.
- The semantic token layer uses `Readonly<>` TypeScript types to enforce immutability at compile time.
- The `ThemeRenderer` interface ensures any future theme (minimal, abstract) can be added by implementing 4 render functions.
- Performance: SVG-based like the current graph. Event-driven re-renders only. No polling loops in the theme layer.
- The MiniGraph component in the chat view will also respect the active theme.
