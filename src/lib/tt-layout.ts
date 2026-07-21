/**
 * TT-specific Layout Algorithm
 *
 * Maps FreeMind scores to discrete radii aligned with the TTBackground SVG
 * landmarks (dark core, blue ring, white ring). Uses ttLandmarks (in graph-SVG
 * coordinate units) supplied by the caller.
 *
 * Level mapping (TT only):
 *  - Level 10 (>= 2500)        → R=0 (exact center; multiple level-10 nodes orbit a tiny ring)
 *  - Level  9 (1750..2499)     → 0.75 × Rcore
 *  - Level  8 (1250..1749)     → 0.50 × Rcore
 *  - Level  7 (1000..1249)     → 0.25 × Rcore
 *  - Level  6 ( 750.. 999)     → Rcore + 0.12 × (Rblue−Rcore)
 *  - Level  5 ( 500.. 749)     → Rcore + 0.30 × (Rblue−Rcore)
 *  - Level  4 ( 250.. 499)     → Rcore + 0.50 × (Rblue−Rcore)
 *  - Level  3 (  50.. 249)     → Rcore + 0.70 × (Rblue−Rcore)  ← starter ring
 *  - Level  2 (  10..  49)     → Rcore + 0.88 × (Rblue−Rcore)
 *  - Level  1 (   0)           → Rblue − tinyPad
 *  - Extreme A (-1..-1000)     → Rwhite + 4
 *  - Extreme B (-1001..-2500)  → Rwhite + 4 + step
 *  - Extreme C (< -2500)       → Rwhite + 4 + 2×step
 *
 * Newly added nodes (no chats) start with 50 starter points → Level 3.
 */

import { GraphNode, GraphEdge, GraphData, ChatRating, Opinion, LayoutConfig, RespectfulZoneSlot } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';
import { calculateFreeMindScore } from '@/lib/freemind-layout';

export interface TTLandmarks {
  /** Radius of the dark core (graph-SVG units). */
  coreR: number;
  /** Outer radius of the blue ring (graph-SVG units). */
  blueR: number;
  /** Outer radius of the white ring (graph-SVG units). */
  whiteR: number;
}

const STARTER_POINTS = 50;
const EXTREME_STEP = 18;

/**
 * Returns radii (in graph-SVG units) for each TT level so callers can render
 * thin guide rings aligned with both nodes and the background SVG.
 * Skips Level 10 when its radius is 0 (single center point).
 */
export function getTTLevelRadii(landmarks: TTLandmarks): { level: number; r: number }[] {
  const out: { level: number; r: number }[] = [];
  const positiveLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const lvl of positiveLevels) {
    const r = ttLevelToRadius(lvl, landmarks);
    if (r > 0) out.push({ level: lvl, r });
  }
  for (const lvl of [-1, -2, -3]) {
    out.push({ level: lvl, r: ttLevelToRadius(lvl, landmarks) });
  }
  return out;
}

/**
 * Discretize a (possibly negative) score to a level.
 * Positive levels: 1..10. Negative levels: -1, -2, -3 (extreme A/B/C).
 */
function ttScoreToLevel(score: number, hasChats: boolean): number {
  // Newly added nodes get the starter point allocation
  const effective = hasChats ? score : STARTER_POINTS;

  if (effective < 0) {
    if (effective < -2500) return -3;
    if (effective < -1000) return -2;
    return -1;
  }
  if (effective >= 2500) return 10;
  if (effective >= 1750) return 9;
  if (effective >= 1250) return 8;
  if (effective >= 1000) return 7;
  if (effective >= 750) return 6;
  if (effective >= 500) return 5;
  if (effective >= 250) return 4;
  if (effective >= 50) return 3;
  if (effective >= 10) return 2;
  return 1;
}

function ttLevelToRadius(level: number, lm: TTLandmarks): number {
  const { coreR, blueR, whiteR } = lm;
  const blueBand = blueR - coreR;
  const tinyPad = 4;

  switch (level) {
    case 10: return 0;
    case 9:  return coreR * 0.75;
    case 8:  return coreR * 0.50;
    case 7:  return coreR * 0.25;
    case 6:  return coreR + 0.12 * blueBand;
    case 5:  return coreR + 0.30 * blueBand;
    case 4:  return coreR + 0.50 * blueBand;
    case 3:  return coreR + 0.70 * blueBand;
    case 2:  return coreR + 0.88 * blueBand;
    case 1:  return blueR - tinyPad;
    case -1: return whiteR + 4;
    case -2: return whiteR + 4 + EXTREME_STEP;
    case -3: return whiteR + 4 + 2 * EXTREME_STEP;
    default: return blueR - tinyPad;
  }
}

function levelToZone(level: number): 'respectful' | 'moderate' | 'extreme' {
  if (level >= 7) return 'respectful'; // gold star (inside dark core)
  if (level >= 1) return 'moderate';   // emerald (in blue ring)
  return 'extreme';                    // black, smaller (outside white ring)
}

function calculateIdealAngle(disagreement: number): number {
  const minAngle = 0.2;
  const maxAngle = Math.PI;
  return minAngle + (disagreement / 100) * (maxAngle - minAngle);
}

function normalizeAngle(angle: number): number {
  let n = angle % (2 * Math.PI);
  if (n < 0) n += 2 * Math.PI;
  return n;
}

function getMinAngularDistance(angle: number, placed: Map<string, number>): number {
  let minDist = Math.PI;
  for (const placedAngle of placed.values()) {
    let dist = Math.abs(normalizeAngle(angle) - normalizeAngle(placedAngle));
    if (dist > Math.PI) dist = 2 * Math.PI - dist;
    minDist = Math.min(minDist, dist);
  }
  return minDist;
}

function findLargestGap(placed: Map<string, number>): number {
  if (placed.size === 0) return 0;
  if (placed.size === 1) return normalizeAngle([...placed.values()][0] + Math.PI);
  const angles = [...placed.values()].map(normalizeAngle).sort((a, b) => a - b);
  let maxGap = 0;
  let gapStart = 0;
  for (let i = 0; i < angles.length; i++) {
    const next = (i + 1) % angles.length;
    let gap = angles[next] - angles[i];
    if (gap <= 0) gap += 2 * Math.PI;
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = angles[i];
    }
  }
  return normalizeAngle(gapStart + maxGap / 2);
}

function adjustForMinSeparation(angle: number, placed: Map<string, number>, minSep: number): number {
  if (placed.size === 0) return angle;
  let adjusted = normalizeAngle(angle);
  for (let i = 0; i < 50; i++) {
    let tooClose = false;
    for (const placedAngle of placed.values()) {
      let dist = Math.abs(adjusted - normalizeAngle(placedAngle));
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      if (dist < minSep) {
        adjusted = normalizeAngle(adjusted + 0.15);
        tooClose = true;
        break;
      }
    }
    if (!tooClose) break;
  }
  return adjusted;
}

function calculateDeterministicAngles(opinions: Opinion[], ratings: ChatRating[]): Map<string, number> {
  const angleMap = new Map<string, number>();
  if (opinions.length === 0) return angleMap;

  const adjacency = new Map<string, Map<string, number>>();
  opinions.forEach(op => adjacency.set(op.id, new Map()));
  ratings.forEach(r => {
    adjacency.get(r.opinionA)?.set(r.opinionB, r.disagreement);
    adjacency.get(r.opinionB)?.set(r.opinionA, r.disagreement);
  });

  const activeNodes = opinions.filter(op => (adjacency.get(op.id)?.size || 0) > 0);
  const unconnectedNodes = opinions.filter(op => (adjacency.get(op.id)?.size || 0) === 0);

  if (activeNodes.length === 0) {
    const sorted = [...opinions].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((op, i) => angleMap.set(op.id, (i / sorted.length) * 2 * Math.PI));
    return angleMap;
  }

  let maxDisagreement = -1;
  let anchorPair: [string, string] | null = null;
  const sortedRatings = [...ratings].sort((a, b) =>
    [a.opinionA, a.opinionB].sort().join('-').localeCompare([b.opinionA, b.opinionB].sort().join('-')),
  );
  for (const r of sortedRatings) {
    if (r.disagreement > maxDisagreement) {
      maxDisagreement = r.disagreement;
      anchorPair = [r.opinionA, r.opinionB].sort() as [string, string];
    }
  }
  if (!anchorPair) {
    const s = activeNodes.map(n => n.id).sort();
    anchorPair = [s[0], s[1] || s[0]];
  }

  angleMap.set(anchorPair[0], 0);
  if (anchorPair[1] !== anchorPair[0]) angleMap.set(anchorPair[1], Math.PI);

  const remaining = activeNodes.filter(n => !angleMap.has(n.id)).sort((a, b) => a.id.localeCompare(b.id));
  for (const node of remaining) {
    const connections = adjacency.get(node.id) || new Map();
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [connectedId, disagreement] of connections) {
      if (angleMap.has(connectedId)) {
        const ca = angleMap.get(connectedId)!;
        const offset = (disagreement / 100) * Math.PI;
        const c1 = ca + offset;
        const c2 = ca - offset;
        const w = disagreement + 1;
        const s1 = getMinAngularDistance(c1, angleMap);
        const s2 = getMinAngularDistance(c2, angleMap);
        const best = s1 >= s2 ? c1 : c2;
        weightedSum += normalizeAngle(best) * w;
        totalWeight += w;
      }
    }
    let finalAngle = totalWeight > 0 ? weightedSum / totalWeight : findLargestGap(angleMap);
    finalAngle = adjustForMinSeparation(finalAngle, angleMap, 0.35);
    angleMap.set(node.id, normalizeAngle(finalAngle));
  }

  const sortedUnconnected = unconnectedNodes.sort((a, b) => a.id.localeCompare(b.id));
  if (sortedUnconnected.length > 0) {
    const startAngle = angleMap.size > 0 ? findLargestGap(angleMap) : 0;
    const angleStep = (2 * Math.PI) / sortedUnconnected.length;
    sortedUnconnected.forEach((node, index) => {
      let target = normalizeAngle(startAngle + index * angleStep);
      target = adjustForMinSeparation(target, angleMap, 0.2);
      angleMap.set(node.id, target);
    });
  }

  return angleMap;
}

function resolveCollisions(nodes: GraphNode[], config: LayoutConfig, pinnedIds: Set<string>): GraphNode[] {
  if (nodes.length < 2) return nodes;
  const VISUAL_NODE_SIZE = 26;
  const minDist = VISUAL_NODE_SIZE + 4;

  const sorted = [...nodes].map(n => ({ ...n }));
  sorted.sort((a, b) => a.id.localeCompare(b.id));
  const polar = sorted.map(n => {
    const dx = n.x - config.centerX;
    const dy = n.y - config.centerY;
    return {
      id: n.id,
      radius: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx),
      pinned: pinnedIds.has(n.id),
    };
  });

  for (let iter = 0; iter < 20; iter++) {
    const deltas = new Array(polar.length).fill(0);
    let anyOverlap = false;

    for (let i = 0; i < polar.length; i++) {
      for (let j = i + 1; j < polar.length; j++) {
        const a = polar[i];
        const b = polar[j];
        const ax = config.centerX + Math.cos(a.angle) * a.radius;
        const ay = config.centerY + Math.sin(a.angle) * a.radius;
        const bx = config.centerX + Math.cos(b.angle) * b.radius;
        const by = config.centerY + Math.sin(b.angle) * b.radius;
        const dx = ax - bx;
        const dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= minDist || dist < 0.01) continue;
        anyOverlap = true;
        const overlap = minDist - dist;
        const avgR = Math.max((a.radius + b.radius) / 2, 1);
        const angularPush = (overlap / avgR) * 0.5;

        if (a.pinned && b.pinned) {
          // Both pinned — no push
        } else if (a.pinned) {
          deltas[j] -= angularPush * 2;
        } else if (b.pinned) {
          deltas[i] += angularPush * 2;
        } else {
          deltas[i] += angularPush;
          deltas[j] -= angularPush;
        }
      }
    }

    if (!anyOverlap) break;

    for (let i = 0; i < polar.length; i++) {
      if (!polar[i].pinned) {
        polar[i].angle += deltas[i];
      }
    }
  }

  const polarById = new Map(polar.map(p => [p.id, p]));
  return nodes.map(n => {
    const p = polarById.get(n.id);
    if (!p) return n;
    return {
      ...n,
      x: config.centerX + Math.cos(p.angle) * p.radius,
      y: config.centerY + Math.sin(p.angle) * p.radius,
    };
  });
}

/**
 * Compute the total bridging points for a node.
 * totalPoints = Σ (empathy × disagreement) over non-synthetic ratings involving this node.
 * Ordering is deterministic (ratings iterated as passed; sum is commutative).
 */
function computeTotalPoints(nodeId: string, ratings: ChatRating[]): { total: number; hasChats: boolean } {
  let total = 0;
  let hasChats = false;
  for (const r of ratings) {
    if (r.isSynthetic) continue;
    if (r.opinionA !== nodeId && r.opinionB !== nodeId) continue;
    total += r.empathy * r.disagreement;
    hasChats = true;
  }
  return { total, hasChats };
}

export function calculateTTLayout(
  opinions: Opinion[],
  ratings: ChatRating[],
  config: LayoutConfig,
  landmarks: TTLandmarks,
): GraphData {
  const respectfulZoneSlots: RespectfulZoneSlot[] = [];

  // Total-points-based radial positioning.
  //  - Top scorer (max positive total) sits at the center.
  //  - Others are linearly proportional between center and blueR (score 0 → blueR).
  //  - hasChats === false → starter position at blueR − tinyPad (unchanged).
  //  - Negative totals → extreme band (whiteR + step*n), matching legacy tiers.
  const totals = new Map<string, { total: number; hasChats: boolean }>();
  opinions.forEach(op => totals.set(op.id, computeTotalPoints(op.id, ratings)));

  // Deterministic maxTotal: id-sorted iteration; ties for the top go to the lowest id.
  const idSorted = [...opinions].sort((a, b) => a.id.localeCompare(b.id));
  let maxTotal = 0;
  for (const op of idSorted) {
    const t = totals.get(op.id)!.total;
    if (t > maxTotal) maxTotal = t;
  }
  const safeMax = Math.max(maxTotal, 1);

  const tinyPad = 4;
  const blueR = landmarks.blueR;
  const whiteR = landmarks.whiteR;

  // Ids that share the top score — used to give ties a tiny inner orbit so they don't stack.
  const topIds = idSorted.filter(op => totals.get(op.id)!.total === maxTotal && maxTotal > 0).map(op => op.id);
  const topOrbitRadius = topIds.length > 1 ? Math.min(landmarks.coreR * 0.18, 18) : 0;

  const edges: GraphEdge[] = ratings.map(r => ({
    source: r.opinionA,
    target: r.opinionB,
    weight: r.empathy * r.disagreement,
    empathy: r.empathy,
    disagreement: r.disagreement,
    status: 'accepted' as const,
  }));

  const angleMap = calculateDeterministicAngles(opinions, ratings);

  let allNodes: GraphNode[] = opinions.map(op => {
    const { total, hasChats } = totals.get(op.id)!;

    let r: number;
    let level: number;
    let zone: 'respectful' | 'moderate' | 'extreme';

    if (!hasChats) {
      // Starter placement — unchanged from legacy.
      r = blueR - tinyPad;
      level = 3;
      zone = 'moderate';
    } else if (total < 0) {
      // Extreme band — three tiers as before.
      if (total < -2500) { r = whiteR + 4 + 2 * EXTREME_STEP; level = -3; }
      else if (total < -1000) { r = whiteR + 4 + EXTREME_STEP; level = -2; }
      else { r = whiteR + 4; level = -1; }
      zone = 'extreme';
    } else {
      // Positive band — linearly proportional to the top scorer.
      if (topIds.length > 1 && total === maxTotal) {
        r = topOrbitRadius;
      } else {
        r = blueR * (1 - total / safeMax);
      }
      level = total >= safeMax * 0.5 ? 7 : total > 0 ? 4 : 3;
      zone = r <= landmarks.coreR ? 'respectful' : 'moderate';
    }

    const angle = angleMap.get(op.id) || 0;
    return {
      id: op.id,
      x: config.centerX + Math.cos(angle) * r,
      y: config.centerY + Math.sin(angle) * r,
      opinion: op,
      isBridge: total > 2500,
      distanceToCenter: r,
      hasChats,
      level,
      zone,
      totalPoints: total,
    };
  });

  // Pin the bot to 6 o'clock at the legacy starter ring
  allNodes = allNodes.map(node => {
    if (node.opinion.authorId === BOT_USER_ID) {
      const r = ttLevelToRadius(3, landmarks);
      return {
        ...node,
        x: config.centerX,
        y: config.centerY + r,
        distanceToCenter: r,
        hasChats: true,
        zone: 'moderate' as const,
      };
    }
    return node;
  });

  const pinnedIds = new Set<string>();
  for (const n of allNodes) if (n.opinion.authorId === BOT_USER_ID) pinnedIds.add(n.id);

  allNodes = resolveCollisions(allNodes, config, pinnedIds);

  return { nodes: allNodes, edges, respectfulZoneSlots };
}

