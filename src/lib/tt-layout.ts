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
import { isBotUser } from '@/lib/constants';
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
  return minAngle + (disagreement / 10) * (maxAngle - minAngle);
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
        adjusted = normalizeAngle(adjusted + 0.08);
        tooClose = true;
        break;
      }
    }
    if (!tooClose) break;
  }
  return adjusted;
}

/** Absolute angular distance in [0, PI]. */
function angularDistance(a: number, b: number): number {
  let d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/** Desired angular distance for a pair-averaged disagreement (0..10). */
function desiredSeparation(disagreement: number): number {
  const clamped = Math.max(0, Math.min(10, disagreement));
  return (clamped / 10) * Math.PI;
}

/**
 * Deterministic angular layout driven by the pair-AVERAGED disagreement.
 *
 * Similar opinions (low disagreement) are pulled towards each other, which is
 * what makes clusters emerge; opposing opinions end up on opposite sides.
 * For each node we build the candidate angles implied by every already placed
 * neighbour and pick the candidate with the lowest weighted error against ALL
 * placed neighbours (cluster-fit), instead of the candidate that maximises the
 * distance to everything (which used to scatter clusters apart).
 */
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

  // Anchor pair: the strongest opposition, placed at 0 and PI.
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

  // Cluster cores first: the best connected nodes are placed early so later
  // nodes can attach to an existing structure. Deterministic: degree desc, id asc.
  const remaining = activeNodes
    .filter(n => !angleMap.has(n.id))
    .sort((a, b) => {
      const da = adjacency.get(a.id)?.size || 0;
      const db = adjacency.get(b.id)?.size || 0;
      if (db !== da) return db - da;
      return a.id.localeCompare(b.id);
    });

  /** Weighted error of a candidate angle against all placed neighbours. */
  const candidateError = (candidate: number, connections: Map<string, number>): number => {
    let err = 0;
    let wSum = 0;
    for (const [id, disagreement] of [...connections.entries()].sort((x, y) => x[0].localeCompare(y[0]))) {
      const placedAngle = angleMap.get(id);
      if (placedAngle == null) continue;
      const want = desiredSeparation(disagreement);
      const have = angularDistance(candidate, placedAngle);
      // Agreement (low disagreement) weighs more so clusters hold together.
      const w = 11 - Math.max(0, Math.min(10, disagreement));
      err += w * (have - want) * (have - want);
      wSum += w;
    }
    return wSum > 0 ? err / wSum : Number.POSITIVE_INFINITY;
  };

  for (const node of remaining) {
    const connections = adjacency.get(node.id) || new Map<string, number>();

    const candidates: number[] = [];
    for (const [id, disagreement] of [...connections.entries()].sort((x, y) => x[0].localeCompare(y[0]))) {
      const placedAngle = angleMap.get(id);
      if (placedAngle == null) continue;
      const offset = desiredSeparation(disagreement);
      candidates.push(normalizeAngle(placedAngle + offset));
      candidates.push(normalizeAngle(placedAngle - offset));
    }

    let finalAngle: number;
    if (candidates.length === 0) {
      finalAngle = findLargestGap(angleMap);
    } else {
      let best = candidates[0];
      let bestErr = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        const e = candidateError(c, connections);
        // Deterministic tie-break: lower angle wins.
        if (e < bestErr - 1e-9 || (Math.abs(e - bestErr) <= 1e-9 && c < best)) {
          bestErr = e;
          best = c;
        }
      }
      finalAngle = best;
    }

    // Small minimum separation only — clusters are allowed to stay tight.
    finalAngle = adjustForMinSeparation(finalAngle, angleMap, 0.18);
    angleMap.set(node.id, normalizeAngle(finalAngle));
  }

  const sortedUnconnected = unconnectedNodes.sort((a, b) => a.id.localeCompare(b.id));
  if (sortedUnconnected.length > 0) {
    const startAngle = angleMap.size > 0 ? findLargestGap(angleMap) : 0;
    const angleStep = (2 * Math.PI) / sortedUnconnected.length;
    sortedUnconnected.forEach((node, index) => {
      let target = normalizeAngle(startAngle + index * angleStep);
      target = adjustForMinSeparation(target, angleMap, 0.15);
      angleMap.set(node.id, target);
    });
  }

  return angleMap;
}

/**
 * Cluster-friendly collision resolution.
 *
 * Angular displacement is capped so the disagreement-derived angles survive;
 * when the cap is not enough, nodes are nudged radially by a few pixels inside
 * their own points ring instead of sliding far along the circle.
 */
function resolveCollisions(nodes: GraphNode[], config: LayoutConfig, pinnedIds: Set<string>): GraphNode[] {
  if (nodes.length < 2) return nodes;
  const VISUAL_NODE_SIZE = 26;
  const minDist = VISUAL_NODE_SIZE + 4;
  /** Max angular deviation from the semantic angle (radians). */
  const MAX_ANGULAR_DRIFT = 0.22;
  /** Max radial deviation from the points ring (px). */
  const MAX_RADIAL_DRIFT = 14;

  const sorted = [...nodes].map(n => ({ ...n }));
  sorted.sort((a, b) => a.id.localeCompare(b.id));
  const polar = sorted.map(n => {
    const dx = n.x - config.centerX;
    const dy = n.y - config.centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    return {
      id: n.id,
      radius,
      baseRadius: radius,
      angle: Math.atan2(dy, dx),
      baseAngle: Math.atan2(dy, dx),
      pinned: pinnedIds.has(n.id),
    };
  });

  const clampDrift = (p: typeof polar[number]) => {
    let drift = normalizeAngle(p.angle) - normalizeAngle(p.baseAngle);
    if (drift > Math.PI) drift -= 2 * Math.PI;
    if (drift < -Math.PI) drift += 2 * Math.PI;
    if (drift > MAX_ANGULAR_DRIFT) p.angle = p.baseAngle + MAX_ANGULAR_DRIFT;
    if (drift < -MAX_ANGULAR_DRIFT) p.angle = p.baseAngle - MAX_ANGULAR_DRIFT;
    p.radius = Math.max(
      p.baseRadius - MAX_RADIAL_DRIFT,
      Math.min(p.baseRadius + MAX_RADIAL_DRIFT, p.radius),
    );
  };

  for (let iter = 0; iter < 30; iter++) {
    const angDeltas = new Array(polar.length).fill(0);
    const radDeltas = new Array(polar.length).fill(0);
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
        const angularPush = Math.min((overlap / avgR) * 0.5, MAX_ANGULAR_DRIFT * 0.35);
        // Radial split: the outer node moves out, the inner node moves in.
        const radialPush = Math.min(overlap * 0.35, 4);
        const aIsOuter = a.radius > b.radius || (a.radius === b.radius && a.id < b.id);

        if (a.pinned && b.pinned) {
          // Both pinned — no push
        } else if (a.pinned) {
          angDeltas[j] -= angularPush * 2;
          radDeltas[j] += aIsOuter ? -radialPush * 2 : radialPush * 2;
        } else if (b.pinned) {
          angDeltas[i] += angularPush * 2;
          radDeltas[i] += aIsOuter ? radialPush * 2 : -radialPush * 2;
        } else {
          angDeltas[i] += angularPush;
          angDeltas[j] -= angularPush;
          radDeltas[i] += aIsOuter ? radialPush : -radialPush;
          radDeltas[j] += aIsOuter ? -radialPush : radialPush;
        }
      }
    }

    if (!anyOverlap) break;

    for (let i = 0; i < polar.length; i++) {
      const p = polar[i];
      if (p.pinned) continue;
      p.angle += angDeltas[i];
      p.radius = Math.max(0, p.radius + radDeltas[i]);
      clampDrift(p);
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
      distanceToCenter: p.radius,
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
  /**
   * Directed points per opinion (points awarded BY the counterpart).
   * When provided it is the single source of truth for radial position:
   * a node only earns points from how its opponents rated it.
   */
  directedPoints?: Map<string, number>,
): GraphData {
  const respectfulZoneSlots: RespectfulZoneSlot[] = [];

  // Total-points-based radial positioning.
  //  - Top scorer (max positive total) sits at the center.
  //  - Others are linearly proportional between center and blueR (score 0 → blueR).
  //  - hasChats === false → starter position at blueR − tinyPad (unchanged).
  //  - Negative totals → extreme band (whiteR + step*n), matching legacy tiers.
  const totals = new Map<string, { total: number; hasChats: boolean }>();
  opinions.forEach(op => {
    if (directedPoints) {
      const has = directedPoints.has(op.id);
      totals.set(op.id, { total: has ? directedPoints.get(op.id)! : 0, hasChats: has });
    } else {
      totals.set(op.id, computeTotalPoints(op.id, ratings));
    }
  });


  // Deterministic maxTotal: id-sorted iteration; ties for the top go to the lowest id.
  const idSorted = [...opinions].sort((a, b) => a.id.localeCompare(b.id));
  let maxTotal = 0;
  for (const op of idSorted) {
    const t = totals.get(op.id)!.total;
    if (t > maxTotal) maxTotal = t;
  }
  const safeMax = Math.max(maxTotal, 1);

  const tinyPad = 4;
  // Node radius (~13px) + a couple px breathing room. Every positive-tier and
  // extreme radius is capped so the visual node stays fully inside the phone frame.
  const nodeSafePad = 16;
  const blueR = landmarks.blueR;
  const whiteR = landmarks.whiteR;
  const maxVisibleR = blueR - nodeSafePad;

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

  // Score-based radial positioning for nodes with positive totals.
  //  - Radius comes from the ratio of a node's points to the current top score,
  //    NOT from its ordinal rank. Rank-based placement pushed the runner-up to
  //    the outermost ring whenever only two scores existed.
  //  - The best node sits at the center; nodes with points always stay clearly
  //    inside the outermost ring, which is reserved for "no points yet".
  const positives = idSorted
    .filter(op => {
      const t = totals.get(op.id)!;
      return t.hasChats && t.total > 0 && !isBotUser(op.authorId);
    })
    .sort((a, b) => {
      const ta = totals.get(a.id)!.total;
      const tb = totals.get(b.id)!.total;
      if (tb !== ta) return tb - ta;
      return a.id.localeCompare(b.id);
    });

  /** Radial fraction (0 = center, 1 = outermost visible ring) for a score. */
  const fracForTotal = (total: number): number => {
    const ratio = Math.min(1, Math.max(0, total / safeMax));
    // Soft curve: mid scores land mid-field instead of near the rim.
    // 0.85 keeps scoring nodes off the zero-point ring.
    return Math.pow(1 - ratio, 0.8) * 0.85;
  };


  // Outer-ring rendering.
  //
  // Scores can no longer be negative (both ratings are 0..10). Every node with
  // zero points — new nodes included — lines up on the outermost visible ring
  // and renders as inactive. The collision resolver + deterministic angles keep
  // them from stacking.

  // Top 5 by points (deterministic: total desc, id asc) render as stars.
  const top5Ids = new Set(positives.slice(0, 5).map(op => op.id));

  // Rank ratio for star brightness: 0 = best score, 1 = weakest / no points.
  const rankRatioOf = new Map<string, number>();
  positives.forEach((op, i) => {
    rankRatioOf.set(op.id, positives.length <= 1 ? 0 : i / (positives.length - 1));
  });


  let allNodes: GraphNode[] = opinions.map(op => {
    const { total, hasChats } = totals.get(op.id)!;

    let r: number;
    let level: number;
    let zone: 'respectful' | 'moderate' | 'extreme';
    let isInactive = false;

    if (total <= 0 && !isBotUser(op.authorId)) {
      // No points yet → outermost visible ring, dimmed.
      r = maxVisibleR;
      level = 1;
      zone = 'extreme';
      isInactive = true;
    } else {
      // Positive band — radius from the points/top-score ratio. Nodes sharing a
      // total share a radius; the collision resolver spreads them angularly.
      const frac = fracForTotal(total);
      const baseR = frac * maxVisibleR;
      // Top-tied cohort needs a small orbit — angular collision push at r=0
      // moves nodes by ~0, so ties would stack on the exact center.
      const isTopGroup = total >= maxTotal && maxTotal > 0;
      r = isTopGroup && topIds.length > 1 ? Math.max(baseR, topOrbitRadius) : baseR;
      level = frac <= 0.05 ? 10 : frac < 0.5 ? 7 : 4;
      zone = r <= landmarks.coreR ? 'respectful' : 'moderate';
    }


    const angle = angleMap.get(op.id) || 0;
    return {
      id: op.id,
      x: config.centerX + Math.cos(angle) * r,
      y: config.centerY + Math.sin(angle) * r,
      opinion: op,
      isBridge: top5Ids.has(op.id),
      distanceToCenter: r,
      hasChats,
      level,
      zone,
      totalPoints: total,
      isTop5: top5Ids.has(op.id),
      isInactive,
      rankRatio: rankRatioOf.get(op.id) ?? 1,

    };
  });


  // Pin the bot to 6 o'clock at the legacy starter ring
  allNodes = allNodes.map(node => {
    if (isBotUser(node.opinion.authorId)) {
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
  for (const n of allNodes) if (isBotUser(n.opinion.authorId)) pinnedIds.add(n.id);

  allNodes = resolveCollisions(allNodes, config, pinnedIds);

  return { nodes: allNodes, edges, respectfulZoneSlots };
}

