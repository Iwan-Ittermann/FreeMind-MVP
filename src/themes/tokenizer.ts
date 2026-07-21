/**
 * Layer B — Tokenizer
 * 
 * Pure functions that convert GraphNode/GraphEdge into SemanticTokens.
 * Deterministic, read-only, no side effects.
 */

import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';
import { ActiveChat } from '@/hooks/useTopicData';
import {
  SemanticNodeToken,
  SemanticEdgeToken,
  SemanticZone,
  SemanticZoneToken,
} from './types';

/**
 * Determine semantic zone from a GraphNode.
 * Zone names: core = respectful, middle = moderate, outer = extreme
 * Uses the zone field set by the layout algorithm (based on discrete levels).
 */
function resolveZone(node: GraphNode, config: LayoutConfig): SemanticZone {
  if (node.zone === 'respectful' || node.isBridge) return 'core';
  if (node.zone === 'extreme') return 'outer';
  if (node.zone === 'moderate') return 'middle';

  // Fallback: distance-based
  const dist = node.distanceToCenter ?? config.outerRadius;
  if (dist <= config.respectfulRadius) return 'core';
  if (dist <= config.moderateRadius) return 'middle';
  return 'outer';
}

/**
 * Normalize a FreeMind score (-5000..+5000) to 0..1
 */
function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, (score + 5000) / 10000));
}

/**
 * Calculate activity level from chat participation.
 * Uses the number of edges connected to a node as a proxy.
 */
function computeActivityLevel(nodeId: string, edges: GraphEdge[]): number {
  const edgeCount = edges.filter(
    e => e.source === nodeId || e.target === nodeId,
  ).length;
  // Normalize: 0 edges → 0, 10+ edges → 1
  return Math.min(1, edgeCount / 10);
}

// --- Public API ---

/**
 * Tokenize a single node. Zone may be overridden by enforceCoreCap.
 */
export function tokenizeNode(
  node: GraphNode,
  config: LayoutConfig,
  edges: GraphEdge[],
  currentUserId: string | null,
  currentUserOpinionId: string | null,
  zoneOverride?: SemanticZone,
): SemanticNodeToken {
  const zone = zoneOverride ?? resolveZone(node, config);
  // For TT the layout now sets `totalPoints`. Pipe it through `bridgingScore`
  // so the renderer can show the count next to the node. Fall back to the
  // legacy distance-derived score for other layouts.
  const bridgingScore = node.totalPoints != null
    ? node.totalPoints
    : node.distanceToCenter != null
      ? ((1 - node.distanceToCenter / config.outerRadius) * 10000) - 5000
      : 0;

  return Object.freeze({
    id: node.id,
    x: node.x,
    y: node.y,
    zone,
    nodeRole: 'opinion' as const,
    activityLevel: computeActivityLevel(node.id, edges),
    heightFactor: normalizeScore(bridgingScore),
    radius: config.nodeRadius,
    bridgingScore,
    clusterId: node.cluster ?? null,
    isBridge: node.isBridge ?? false,
    isCurrentUser: !!(currentUserId && node.opinion.authorId === currentUserId),
    isOnline: node.isOnline ?? false,
    hasUnread: node.hasUnreadMessages ?? false,
    unreadCount: node.unreadCount ?? 0,
    hasIncomingRequest: node.isRequester ?? false,
    isHidden: node.opinion.visible === false,
    opinionText: node.opinion.text,
    isBot: node.opinion.authorId === BOT_USER_ID,
  });
}


/**
 * Tokenize all nodes.
 */
export function tokenizeNodes(
  nodes: GraphNode[],
  config: LayoutConfig,
  edges: GraphEdge[],
  currentUserId: string | null,
  currentUserOpinionId: string | null,
): SemanticNodeToken[] {
  return nodes.map(node =>
    tokenizeNode(node, config, edges, currentUserId, currentUserOpinionId),
  );
}

export function tokenizeEdge(
  edge: GraphEdge,
  nodeMap: ReadonlyMap<string, GraphNode>,
  activeChats: readonly ActiveChat[],
): SemanticEdgeToken {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);

  const sx = source?.x ?? 0;
  const sy = source?.y ?? 0;
  const tx = target?.x ?? 0;
  const ty = target?.y ?? 0;

  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize empathy from -50..+50 to 0..1
  const respectLevel = Math.max(0, Math.min(1, (edge.empathy + 50) / 100));

  const isActive = activeChats.some(
    c =>
      (c.opinionAId === edge.source && c.opinionBId === edge.target) ||
      (c.opinionAId === edge.target && c.opinionBId === edge.source),
  );

  return Object.freeze({
    sourceId: edge.source,
    targetId: edge.target,
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    respectLevel,
    length,
    edgeRole: 'chat' as const,
    isActive,
    isPending: edge.status === 'pending',
  });
}

/**
 * Tokenize zones using semantic radius names.
 * Only 3 zones: core (respectful), middle (moderate), outer (extreme).
 */
export function tokenizeZones(config: LayoutConfig): readonly SemanticZoneToken[] {
  return Object.freeze([
    Object.freeze({
      zone: 'outer' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: config.moderateRadius,
      outerRadius: config.outerRadius,
    }),
    Object.freeze({
      zone: 'middle' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: config.respectfulRadius,
      outerRadius: config.moderateRadius,
    }),
    Object.freeze({
      zone: 'core' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: 0,
      outerRadius: config.respectfulRadius,
    }),
  ]);
}
