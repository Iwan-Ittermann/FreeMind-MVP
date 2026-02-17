/**
 * Layer B — Tokenizer
 * 
 * Pure functions that convert GraphNode/GraphEdge into SemanticTokens.
 * Deterministic, read-only, no side effects.
 */

import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat } from '@/hooks/useTopicData';
import {
  SemanticNodeToken,
  SemanticEdgeToken,
  SemanticZone,
  SemanticZoneToken,
} from './types';

/**
 * Determine semantic zone from a GraphNode.
 */
function resolveZone(node: GraphNode, config: LayoutConfig): SemanticZone {
  if (node.zone === 'green') return 'core';
  if (node.hasChats === false) return 'inactive';

  const dist = node.distanceToCenter ?? config.outerRadius;
  if (dist <= config.yellowRadius) return 'middle';
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
  const bridgingScore = node.distanceToCenter != null
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
  });
}

/**
 * Tokenize all nodes with top-5 core zone enforcement.
 * Only the 5 highest bridging-score nodes get zone 'core'.
 * Others that would qualify are placed at 'middle'.
 */
export function tokenizeNodesWithCoreCap(
  nodes: GraphNode[],
  config: LayoutConfig,
  edges: GraphEdge[],
  currentUserId: string | null,
  currentUserOpinionId: string | null,
): SemanticNodeToken[] {
  // First pass: identify which nodes would be core
  const coreEligible: { node: GraphNode; score: number }[] = [];
  const rest: GraphNode[] = [];

  for (const node of nodes) {
    const zone = resolveZone(node, config);
    if (zone === 'core') {
      const score = node.distanceToCenter != null
        ? ((1 - node.distanceToCenter / config.outerRadius) * 10000) - 5000
        : 0;
      coreEligible.push({ node, score });
    } else {
      rest.push(node);
    }
  }

  // Sort by bridging score descending, take top 5
  coreEligible.sort((a, b) => b.score - a.score);
  const top5 = coreEligible.slice(0, 5);
  const overflow = coreEligible.slice(5);

  const tokens: SemanticNodeToken[] = [];

  // Top 5 keep core zone
  for (const { node } of top5) {
    tokens.push(tokenizeNode(node, config, edges, currentUserId, currentUserOpinionId, 'core'));
  }

  // Overflow nodes pushed to middle zone
  for (const { node } of overflow) {
    tokens.push(tokenizeNode(node, config, edges, currentUserId, currentUserOpinionId, 'middle'));
  }

  // Rest keep their natural zone
  for (const node of rest) {
    tokens.push(tokenizeNode(node, config, edges, currentUserId, currentUserOpinionId));
  }

  return tokens;
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

export function tokenizeZones(config: LayoutConfig): readonly SemanticZoneToken[] {
  return Object.freeze([
    Object.freeze({
      zone: 'inactive' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: config.pinkRadius,
      outerRadius: config.outerRadius,
    }),
    Object.freeze({
      zone: 'outer' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: config.yellowRadius,
      outerRadius: config.pinkRadius,
    }),
    Object.freeze({
      zone: 'middle' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: config.greenRadius,
      outerRadius: config.yellowRadius,
    }),
    Object.freeze({
      zone: 'core' as const,
      centerX: config.centerX,
      centerY: config.centerY,
      innerRadius: 0,
      outerRadius: config.greenRadius,
    }),
  ]);
}
