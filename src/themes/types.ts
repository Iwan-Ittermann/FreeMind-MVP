/**
 * Layer B — Semantic Token Layer
 * 
 * Strict TypeScript interfaces that translate raw graph data into
 * normalized semantic tokens. No visual decisions live here.
 * All tokens are Readonly to enforce immutability at compile time.
 */

import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';

// --- Zone Types ---
// Semantic zone names: core = respectful, middle = moderate, outer = extreme
export type SemanticZone = 'core' | 'middle' | 'outer';

// --- Node Token ---
export type SemanticNodeToken = Readonly<{
  id: string;
  x: number;
  y: number;
  zone: SemanticZone;
  nodeRole: 'opinion';
  activityLevel: number;    // 0–1 normalized
  heightFactor: number;     // 0–1 normalized (bridging score mapped)
  radius: number;           // base display radius
  bridgingScore: number;    // raw FreeMind score
  clusterId: number | null;
  isBridge: boolean;
  isCurrentUser: boolean;
  isOnline: boolean;
  hasUnread: boolean;
  unreadCount: number;
  hasIncomingRequest: boolean;
  isHidden: boolean;
  opinionText: string;
  isBot: boolean;
}>;

// --- Edge Token ---
export type SemanticEdgeToken = Readonly<{
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  respectLevel: number;     // 0–1 normalized from empathy
  length: number;           // pixel distance
  edgeRole: 'chat';
  isActive: boolean;
  isPending: boolean;
}>;

// --- Event Token ---
export type SemanticEventType =
  | 'cluster-bridge'
  | 'respect-threshold'
  | 'zone-entry'
  | 'rating-complete';

export type SemanticEventToken = Readonly<{
  eventType: SemanticEventType;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  timestamp: number;
}>;

// --- Zone Token ---
export type SemanticZoneToken = Readonly<{
  zone: SemanticZone;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}>;

// --- Theme Renderer Interface ---
export interface ThemeRenderer {
  renderZones(zones: readonly SemanticZoneToken[], config: LayoutConfig): React.ReactNode;
  renderNodes(
    nodes: readonly SemanticNodeToken[],
    highlightedId: string | null,
    onNodeClick: (id: string) => void,
    onNodeHover: (id: string | null) => void,
  ): React.ReactNode;
  renderEdges(
    edges: readonly SemanticEdgeToken[],
    highlightedNodeId: string | null,
    onEdgeClick: (sourceId: string, targetId: string) => void,
  ): React.ReactNode;
  renderEvents(events: readonly SemanticEventToken[]): React.ReactNode;
}

// --- Theme Name ---
export type ThemeName = 'classic' | 'city' | 'arcane' | 'signal';
