/**
 * FreeMind Layout Algorithm
 * 
 * Positions nodes based on their FreeMind Score (determines radius from center)
 * and disagreement ratings (determines angular separation between connected nodes).
 * 
 * Key concepts:
 * - Bridging Score (per user per chat) = empathy × disagreement
 *   - empathy: -50 to +50, disagreement: 0 to 100
 *   - Range: -5000 to +5000
 * - FreeMind Score (per node) = average of all chat Bridging Scores
 * - Zones based on FreeMind Score:
 *   - Respectful zone (center): > 2500
 *   - Moderate zone (middle): 0 to 2500
 *   - Extreme zone (outer): < 0
 * - Angular separation based on disagreement: high disagreement = far apart
 * - Nodes with no chats start at the moderate zone border (level 3)
 */

import { GraphNode, GraphEdge, GraphData, ChatRating, Opinion, LayoutConfig, RespectfulZoneSlot } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';

// Zone border snapping: nodes are nudged away from zone boundaries
// so they sit fully inside one zone (no straddling).

/**
 * Calculate the Bridging Score for a specific opinion in a specific chat
 * Bridging Score = empathy × disagreement
 */
function calculateBridgingScore(empathy: number, disagreement: number): number {
  return empathy * disagreement;
}

/**
 * Calculate the FreeMind Score for a node
 * FreeMind Score = average of all Bridging Scores from the node's chats
 */
function calculateFreeMindScore(
  nodeId: string,
  ratings: ChatRating[]
): { freeMindScore: number; hasChats: boolean; chatCount: number } {
  const nodeRatings = ratings.filter(
    r => r.opinionA === nodeId || r.opinionB === nodeId
  );

  if (nodeRatings.length === 0) {
    return { freeMindScore: 0, hasChats: false, chatCount: 0 };
  }

  const totalBridgingScore = nodeRatings.reduce((sum, r) => {
    const chatBridging = calculateBridgingScore(r.empathy, r.disagreement);
    return sum + chatBridging;
  }, 0);

  const freeMindScore = totalBridgingScore / nodeRatings.length;

  return { freeMindScore, hasChats: true, chatCount: nodeRatings.length };
}

/**
 * Check if node is a "bridge" - high positive bridging score
 * Threshold: > 2500
 */
function isBridgeNode(freeMindScore: number): boolean {
  return freeMindScore > 2500;
}

/**
 * Calculate the ideal angular distance between two connected nodes
 * based on their disagreement rating.
 */
function calculateIdealAngle(disagreement: number): number {
  const minAngle = 0.2;
  const maxAngle = Math.PI;
  return minAngle + (disagreement / 100) * (maxAngle - minAngle);
}

/**
 * Angular constraint optimization using iterative relaxation
 */
function optimizeAngularPositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig,
  iterations: number = 100
): GraphNode[] {
  const updated = nodes.map(n => ({ ...n }));
  
  const polarPositions = updated.map(node => {
    const dx = node.x - config.centerX;
    const dy = node.y - config.centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    return { id: node.id, radius, angle };
  });
  
  const polarMap = new Map(polarPositions.map(p => [p.id, p]));
  
  for (let iter = 0; iter < iterations; iter++) {
    const angularForces = new Map<string, number>();
    polarPositions.forEach(p => angularForces.set(p.id, 0));
    
    edges.forEach(edge => {
      const sourcePos = polarMap.get(edge.source);
      const targetPos = polarMap.get(edge.target);
      if (!sourcePos || !targetPos) return;
      
      const idealAngle = calculateIdealAngle(edge.disagreement);
      let actualAngle = Math.abs(sourcePos.angle - targetPos.angle);
      
      if (actualAngle > Math.PI) actualAngle = 2 * Math.PI - actualAngle;
      
      const angleDiff = idealAngle - actualAngle;
      const force = angleDiff * 0.1;
      
      const currentSourceForce = angularForces.get(edge.source) || 0;
      const currentTargetForce = angularForces.get(edge.target) || 0;
      
      angularForces.set(edge.source, currentSourceForce - force);
      angularForces.set(edge.target, currentTargetForce + force);
    });
    
    polarPositions.forEach(pos => {
      const force = angularForces.get(pos.id) || 0;
      pos.angle += force;
      while (pos.angle > Math.PI) pos.angle -= 2 * Math.PI;
      while (pos.angle < -Math.PI) pos.angle += 2 * Math.PI;
    });
  }
  
  return updated.map(node => {
    const polar = polarMap.get(node.id)!;
    return {
      ...node,
      x: config.centerX + Math.cos(polar.angle) * polar.radius,
      y: config.centerY + Math.sin(polar.angle) * polar.radius,
    };
  });
}

/**
 * Calculate deterministic angles for nodes based on disagreement ratings.
 */
function calculateDeterministicAngles(
  opinions: Opinion[],
  ratings: ChatRating[]
): Map<string, number> {
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
    const sortedOpinions = [...opinions].sort((a, b) => a.id.localeCompare(b.id));
    sortedOpinions.forEach((op, i) => {
      angleMap.set(op.id, (i / sortedOpinions.length) * 2 * Math.PI);
    });
    return angleMap;
  }
  
  // Find the pair with maximum disagreement
  let maxDisagreement = -1;
  let anchorPair: [string, string] | null = null;
  
  const sortedRatings = [...ratings].sort((a, b) => {
    const keyA = [a.opinionA, a.opinionB].sort().join('-');
    const keyB = [b.opinionA, b.opinionB].sort().join('-');
    return keyA.localeCompare(keyB);
  });
  
  for (const r of sortedRatings) {
    if (r.disagreement > maxDisagreement) {
      maxDisagreement = r.disagreement;
      anchorPair = [r.opinionA, r.opinionB].sort() as [string, string];
    }
  }
  
  if (!anchorPair) {
    const sorted = activeNodes.map(n => n.id).sort();
    anchorPair = [sorted[0], sorted[1] || sorted[0]];
  }
  
  angleMap.set(anchorPair[0], 0);
  if (anchorPair[1] !== anchorPair[0]) {
    angleMap.set(anchorPair[1], Math.PI);
  }
  
  // Position remaining connected nodes
  const remainingActive = activeNodes
    .filter(n => !angleMap.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  
  for (const node of remainingActive) {
    const connections = adjacency.get(node.id) || new Map();
    
    let weightedAngleSum = 0;
    let totalWeight = 0;
    
    for (const [connectedId, disagreement] of connections) {
      if (angleMap.has(connectedId)) {
        const connectedAngle = angleMap.get(connectedId)!;
        const targetOffset = (disagreement / 100) * Math.PI;
        const candidateAngle1 = connectedAngle + targetOffset;
        const candidateAngle2 = connectedAngle - targetOffset;
        const weight = disagreement + 1;
        const score1 = getMinAngularDistance(candidateAngle1, angleMap);
        const score2 = getMinAngularDistance(candidateAngle2, angleMap);
        const bestCandidate = score1 >= score2 ? candidateAngle1 : candidateAngle2;
        weightedAngleSum += normalizeAngle(bestCandidate) * weight;
        totalWeight += weight;
      }
    }
    
    let finalAngle: number;
    
    if (totalWeight > 0) {
      finalAngle = weightedAngleSum / totalWeight;
    } else {
      finalAngle = findLargestGap(angleMap);
    }
    
    finalAngle = adjustForMinSeparation(finalAngle, angleMap, 0.35);
    angleMap.set(node.id, normalizeAngle(finalAngle));
  }
  
  // Place unconnected nodes evenly distributed
  const sortedUnconnected = unconnectedNodes.sort((a, b) => a.id.localeCompare(b.id));
  
  if (sortedUnconnected.length > 0) {
    const startAngle = angleMap.size > 0 ? findLargestGap(angleMap) : 0;
    const angleStep = (2 * Math.PI) / sortedUnconnected.length;
    
    sortedUnconnected.forEach((node, index) => {
      let targetAngle = normalizeAngle(startAngle + index * angleStep);
      targetAngle = adjustForMinSeparation(targetAngle, angleMap, 0.2);
      angleMap.set(node.id, targetAngle);
    });
  }
  
  return angleMap;
}

function normalizeAngle(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
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

function adjustForMinSeparation(
  angle: number, 
  placed: Map<string, number>, 
  minSep: number
): number {
  if (placed.size === 0) return angle;
  
  let adjusted = normalizeAngle(angle);
  let iterations = 0;
  const maxIterations = 50;
  
  while (iterations < maxIterations) {
    let tooClose = false;
    for (const placedAngle of placed.values()) {
      let dist = Math.abs(adjusted - normalizeAngle(placedAngle));
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      if (dist < minSep) {
        const direction = adjusted > normalizeAngle(placedAngle) ? 1 : -1;
        adjusted = normalizeAngle(adjusted + direction * 0.15);
        tooClose = true;
        break;
      }
    }
    if (!tooClose) break;
    iterations++;
  }
  
  return adjusted;
}

/**
 * Map FreeMind score to radius using the semantic zone radii.
 * 
 * Nodes without chats are placed at moderateRadius (level 3 border).
 */
function scoreToRadius(
  freeMindScore: number,
  config: LayoutConfig
): number {
  // Normalize score: -5000 to +5000 → 0 to 1
  const normalizedScore = (freeMindScore + 5000) / 10000;
  
  // Invert: high score = closer to center
  const invertedScore = 1 - normalizedScore;
  
  // Map to radius: 0 → center, 1 → outer edge
  const minRadius = config.nodeRadius * 2;
  const maxRadius = config.outerRadius - config.nodeRadius;
  
  let radius = minRadius + invertedScore * (maxRadius - minRadius);

  // Zone border snapping: if a node center is within nodeRadius of a
  // zone boundary, nudge it fully into the zone where >50% of it sits.
  const pad = config.nodeRadius + 2;
  const boundaries = [config.respectfulRadius, config.moderateRadius, config.extremeRadius];

  for (const boundary of boundaries) {
    if (Math.abs(radius - boundary) < config.nodeRadius) {
      radius = radius < boundary
        ? boundary - pad
        : boundary + pad;
    }
  }

  // Clamp to valid range
  return Math.max(minRadius, Math.min(maxRadius, radius));
}

// Main layout function
export function calculateLayout(
  opinions: Opinion[],
  ratings: ChatRating[],
  config: LayoutConfig
): GraphData {
  // Step 1: Calculate FreeMind scores for each node
  const nodeScores = new Map<string, { freeMindScore: number; hasChats: boolean; chatCount: number }>();
  opinions.forEach(op => {
    nodeScores.set(op.id, calculateFreeMindScore(op.id, ratings));
  });

  // Respectful zone slots are no longer used (core zone uses standard layout)
  const respectfulZoneSlots: RespectfulZoneSlot[] = [];

  // Step 3: Separate active (has chats) and unconnected (no chats) nodes
  const activeOpinions = opinions.filter(op => nodeScores.get(op.id)?.hasChats);
  const unconnectedOpinions = opinions.filter(op => !nodeScores.get(op.id)?.hasChats);

  // Step 4: Create edges from ratings
  const edges: GraphEdge[] = ratings.map(r => ({
    source: r.opinionA,
    target: r.opinionB,
    weight: calculateBridgingScore(r.empathy, r.disagreement),
    empathy: r.empathy,
    disagreement: r.disagreement,
    status: 'accepted' as const,
  }));

  // Step 5: Calculate deterministic angles based on disagreement ratings
  const angleMap = calculateDeterministicAngles(opinions, ratings);

  // Step 6: Position active nodes (all use linear radius + angle)
  const activeNodes: GraphNode[] = activeOpinions.map((op) => {
    const scores = nodeScores.get(op.id)!;
    const targetRadius = scoreToRadius(scores.freeMindScore, config);
    const angle = angleMap.get(op.id) || 0;
    const x = config.centerX + Math.cos(angle) * targetRadius;
    const y = config.centerY + Math.sin(angle) * targetRadius;

    return {
      id: op.id,
      x,
      y,
      opinion: op,
      isBridge: isBridgeNode(scores.freeMindScore),
      distanceToCenter: targetRadius,
      hasChats: true,
      zone: isBridgeNode(scores.freeMindScore) ? 'respectful' as const : undefined,
    };
  });

  // Step 7: Place unconnected nodes at moderate zone border
  // No more "inactive" zone — they start in the moderate zone
  const unconnectedRadius = config.moderateRadius - config.nodeRadius * 2;
  const unconnectedNodes: GraphNode[] = unconnectedOpinions.map((op) => {
    const angle = angleMap.get(op.id) || 0;

    return {
      id: op.id,
      x: config.centerX + Math.cos(angle) * unconnectedRadius,
      y: config.centerY + Math.sin(angle) * unconnectedRadius,
      opinion: op,
      isBridge: false,
      distanceToCenter: unconnectedRadius,
      hasChats: false,
    };
  });

  // Combine active and unconnected nodes
  let allNodes = [...activeNodes, ...unconnectedNodes];

  // Fix bot node position BEFORE collision resolution so it participates
  allNodes = allNodes.map(node => {
    if (node.opinion.authorId === BOT_USER_ID) {
      const botRadius = (config.respectfulRadius + config.moderateRadius) / 2;
      return {
        ...node,
        x: config.centerX,
        y: config.centerY + botRadius,
        distanceToCenter: botRadius,
        hasChats: true,
      };
    }
    return node;
  });

  // Build set of pinned node IDs (bot node stays fixed)
  const pinnedIds = new Set<string>();
  for (const node of allNodes) {
    if (node.opinion.authorId === BOT_USER_ID) {
      pinnedIds.add(node.id);
    }
  }

  // Collision avoidance: push overlapping nodes apart angularly (never change radius)
  allNodes = resolveCollisions(allNodes, config, 12, pinnedIds);

  return { nodes: allNodes, edges, respectfulZoneSlots };
}

/**
 * Post-layout collision resolution.
 * Pushes overlapping nodes apart by adjusting angles only (never radii),
 * so nodes can never cross zone boundaries.
 */
function resolveCollisions(nodes: GraphNode[], config: LayoutConfig, iterations: number = 12, pinnedIds: Set<string> = new Set()): GraphNode[] {
  if (nodes.length < 2) return nodes;

  const VISUAL_NODE_SIZE = 48;
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

  for (let iter = 0; iter < iterations; iter++) {
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

  const result = sorted.map((node, i) => ({
    ...node,
    x: config.centerX + Math.cos(polar[i].angle) * polar[i].radius,
    y: config.centerY + Math.sin(polar[i].angle) * polar[i].radius,
  }));

  return result;
}

// Generate mock data for testing
export function generateMockData(count: number = 30): { opinions: Opinion[]; ratings: ChatRating[] } {
  const opinions: Opinion[] = Array.from({ length: count }, (_, i) => ({
    id: `opinion-${i}`,
    text: `Opinion ${i + 1} about an important topic that people have different views on.`,
  }));

  const ratings: ChatRating[] = [];
  
  const clusterCount = 5;
  const nodesPerCluster = Math.floor(count * 0.6 / clusterCount);
  const bridgeNodeCount = Math.floor(count * 0.08);
  const polarizingNodeCount = Math.floor(count * 0.12);
  
  const bridgeNodes = opinions.slice(0, bridgeNodeCount);
  const polarizingNodes = opinions.slice(bridgeNodeCount, bridgeNodeCount + polarizingNodeCount);
  const clusterNodes: Opinion[][] = [];
  
  let startIdx = bridgeNodeCount + polarizingNodeCount;
  for (let c = 0; c < clusterCount; c++) {
    clusterNodes.push(opinions.slice(startIdx, startIdx + nodesPerCluster));
    startIdx += nodesPerCluster;
  }
  const remainingNodes = opinions.slice(startIdx);
  
  const addRating = (a: string, b: string, empathy: number, disagreement: number) => {
    ratings.push({
      opinionA: a,
      opinionB: b,
      empathy: Math.round(empathy),
      disagreement: Math.round(disagreement),
    });
  };
  
  // Bridge nodes: high empathy + high disagreement (respectful zone)
  for (let i = 0; i < bridgeNodes.length; i++) {
    for (let j = i + 1; j < bridgeNodes.length; j++) {
      addRating(bridgeNodes[i].id, bridgeNodes[j].id, 35 + Math.random() * 15, 70 + Math.random() * 30);
    }
    for (let c = 0; c < clusterCount; c++) {
      if (clusterNodes[c].length > 0 && Math.random() < 0.5) {
        const targetNode = clusterNodes[c][Math.floor(Math.random() * clusterNodes[c].length)];
        addRating(bridgeNodes[i].id, targetNode.id, 30 + Math.random() * 20, 50 + Math.random() * 50);
      }
    }
  }
  
  // Polarizing nodes: negative empathy + high disagreement (extreme zone)
  for (let i = 0; i < polarizingNodes.length; i++) {
    const connectCount = 3 + Math.floor(Math.random() * 3);
    for (let c = 0; c < connectCount; c++) {
      const clusterIdx = Math.floor(Math.random() * clusterCount);
      if (clusterNodes[clusterIdx].length > 0) {
        const targetNode = clusterNodes[clusterIdx][Math.floor(Math.random() * clusterNodes[clusterIdx].length)];
        addRating(polarizingNodes[i].id, targetNode.id, -50 + Math.random() * 30, 70 + Math.random() * 30);
      }
    }
    if (i > 0 && Math.random() < 0.4) {
      addRating(polarizingNodes[i].id, polarizingNodes[i - 1].id, -40 + Math.random() * 20, 80 + Math.random() * 20);
    }
  }
  
  // Cluster nodes: low disagreement within, high between (moderate zone)
  for (let c = 0; c < clusterCount; c++) {
    const cluster = clusterNodes[c];
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        if (Math.random() < 0.5) {
          addRating(cluster[i].id, cluster[j].id, -10 + Math.random() * 40, 5 + Math.random() * 25);
        }
      }
    }
    for (let otherC = c + 1; otherC < clusterCount; otherC++) {
      const otherCluster = clusterNodes[otherC];
      const clusterDistance = Math.abs(otherC - c);
      const connectionDensity = 0.25 / clusterDistance;
      for (let i = 0; i < cluster.length; i++) {
        for (let j = 0; j < otherCluster.length; j++) {
          if (Math.random() < connectionDensity) {
            const baseDisagreement = 20 + clusterDistance * 20;
            const empathy = -20 + Math.random() * 50;
            addRating(cluster[i].id, otherCluster[j].id, empathy, baseDisagreement + Math.random() * 20);
          }
        }
      }
    }
  }
  
  // Remaining nodes connected to clusters (moderate zone)
  for (let i = 0; i < remainingNodes.length; i++) {
    const connectCount = 2 + Math.floor(Math.random() * 3);
    for (let c = 0; c < connectCount; c++) {
      const clusterIdx = Math.floor(Math.random() * clusterCount);
      if (clusterNodes[clusterIdx].length > 0) {
        const targetNode = clusterNodes[clusterIdx][Math.floor(Math.random() * clusterNodes[clusterIdx].length)];
        const empathy = -5 + Math.random() * 35;
        const disagreement = 30 + Math.random() * 40;
        addRating(remainingNodes[i].id, targetNode.id, empathy, disagreement);
      }
    }
    if (i > 0 && Math.random() < 0.3) {
      const prevNode = remainingNodes[Math.floor(Math.random() * i)];
      addRating(remainingNodes[i].id, prevNode.id, 5 + Math.random() * 25, 20 + Math.random() * 40);
    }
  }

  return { opinions, ratings };
}
