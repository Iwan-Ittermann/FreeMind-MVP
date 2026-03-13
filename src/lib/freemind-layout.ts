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
 *   - Green zone (center): > 2500
 *   - Orange zone (middle): 0 to 2500
 *   - Red zone (outer): < 0
 * - Angular separation based on disagreement: high disagreement = far apart
 * - Nodes with no chats: outer ring, evenly spaced, marked as inactive
 */

import { GraphNode, GraphEdge, GraphData, ChatRating, Opinion, LayoutConfig, GreenZoneSlot } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';

// Zone border snapping: nodes are nudged away from zone boundaries
// so they sit fully inside one zone (no straddling).

/**
 * Calculate the Bridging Score for a specific opinion in a specific chat
 * Bridging Score = empathy × disagreement
 * 
 * empathy: -50 to +50
 * disagreement: 0 to 100
 * Result range: -5000 to +5000
 * 
 * High positive bridging score = someone who can empathize while disagreeing (a "bridge builder")
 * Negative bridging score = hostile while disagreeing (polarizing)
 */
function calculateBridgingScore(empathy: number, disagreement: number): number {
  return empathy * disagreement;
}

/**
 * Calculate the FreeMind Score for a node
 * FreeMind Score = average of all Bridging Scores from the node's chats
 * 
 * For each chat, we calculate the average of both participants' bridging scores:
 * Chat Bridging Score = (user_a_bridging + user_b_bridging) / 2
 * 
 * Then FreeMind Score = average of all Chat Bridging Scores for this node
 * 
 * Result range: -5000 to +5000
 */
function calculateFreeMindScore(
  nodeId: string,
  ratings: ChatRating[]
): { freeMindScore: number; hasChats: boolean; chatCount: number } {
  // Find all ratings involving this node
  const nodeRatings = ratings.filter(
    r => r.opinionA === nodeId || r.opinionB === nodeId
  );

  if (nodeRatings.length === 0) {
    return { freeMindScore: 0, hasChats: false, chatCount: 0 };
  }

  // Calculate the average bridging score across all chats
  const totalBridgingScore = nodeRatings.reduce((sum, r) => {
    const chatBridging = calculateBridgingScore(r.empathy, r.disagreement);
    return sum + chatBridging;
  }, 0);

  const freeMindScore = totalBridgingScore / nodeRatings.length;

  return { freeMindScore, hasChats: true, chatCount: nodeRatings.length };
}

/**
 * Check if node is a "bridge" - high positive bridging score
 * These are the most valuable participants who can disagree respectfully
 * 
 * Threshold: > 2500 (e.g., empathy=25+, disagreement=100, or empathy=50, disagreement=50+)
 */
function isBridgeNode(freeMindScore: number): boolean {
  return freeMindScore > 2500;
}

/**
 * Calculate the ideal angular distance between two connected nodes
 * based on their disagreement rating.
 * 
 * High disagreement (100) → maximum angular separation (π radians = opposite sides)
 * Low disagreement (0) → minimum angular separation (close together)
 */
function calculateIdealAngle(disagreement: number): number {
  // Scale disagreement (0-100) to angle: 0 → ~0.2 rad, 100 → π rad
  const minAngle = 0.2; // Minimum separation to avoid overlap
  const maxAngle = Math.PI; // Maximum is opposite sides
  return minAngle + (disagreement / 100) * (maxAngle - minAngle);
}

/**
 * Angular constraint optimization using iterative relaxation
 * Adjusts node angles to minimize the difference between actual and ideal angles
 * based on disagreement ratings between connected pairs.
 */
function optimizeAngularPositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig,
  iterations: number = 100
): GraphNode[] {
  const updated = nodes.map(n => ({ ...n }));
  
  // Convert positions to polar coordinates
  const polarPositions = updated.map(node => {
    const dx = node.x - config.centerX;
    const dy = node.y - config.centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    return { id: node.id, radius, angle };
  });
  
  // Create a map for quick lookup
  const polarMap = new Map(polarPositions.map(p => [p.id, p]));
  
  // Iterative relaxation
  for (let iter = 0; iter < iterations; iter++) {
    const angularForces = new Map<string, number>();
    polarPositions.forEach(p => angularForces.set(p.id, 0));
    
    // For each edge, calculate angular force
    edges.forEach(edge => {
      const sourcePos = polarMap.get(edge.source);
      const targetPos = polarMap.get(edge.target);
      if (!sourcePos || !targetPos) return;
      
      const idealAngle = calculateIdealAngle(edge.disagreement);
      let actualAngle = Math.abs(sourcePos.angle - targetPos.angle);
      
      // Normalize to [0, π]
      if (actualAngle > Math.PI) actualAngle = 2 * Math.PI - actualAngle;
      
      const angleDiff = idealAngle - actualAngle;
      const force = angleDiff * 0.1; // Damping factor
      
      // Apply forces to move nodes toward ideal separation
      const currentSourceForce = angularForces.get(edge.source) || 0;
      const currentTargetForce = angularForces.get(edge.target) || 0;
      
      angularForces.set(edge.source, currentSourceForce - force);
      angularForces.set(edge.target, currentTargetForce + force);
    });
    
    // Apply angular forces
    polarPositions.forEach(pos => {
      const force = angularForces.get(pos.id) || 0;
      pos.angle += force;
      // Normalize angle to [-π, π]
      while (pos.angle > Math.PI) pos.angle -= 2 * Math.PI;
      while (pos.angle < -Math.PI) pos.angle += 2 * Math.PI;
    });
  }
  
  // Convert back to Cartesian coordinates
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
 * 
 * Algorithm:
 * 1. Find the pair with maximum disagreement → place at 0° and 180°
 * 2. For each remaining connected node, calculate weighted angle based on disagreement
 * 3. Place inactive nodes evenly in remaining gaps
 * 
 * This produces identical results for all users viewing the same data.
 */
function calculateDeterministicAngles(
  opinions: Opinion[],
  ratings: ChatRating[]
): Map<string, number> {
  const angleMap = new Map<string, number>();
  
  if (opinions.length === 0) return angleMap;
  
  // Build adjacency map with disagreement weights
  const adjacency = new Map<string, Map<string, number>>();
  opinions.forEach(op => adjacency.set(op.id, new Map()));
  
  ratings.forEach(r => {
    adjacency.get(r.opinionA)?.set(r.opinionB, r.disagreement);
    adjacency.get(r.opinionB)?.set(r.opinionA, r.disagreement);
  });
  
  // Find active nodes (those with at least one rating)
  const activeNodes = opinions.filter(op => (adjacency.get(op.id)?.size || 0) > 0);
  const inactiveNodes = opinions.filter(op => (adjacency.get(op.id)?.size || 0) === 0);
  
  if (activeNodes.length === 0) {
    // No ratings at all - distribute all nodes evenly
    const sortedOpinions = [...opinions].sort((a, b) => a.id.localeCompare(b.id));
    sortedOpinions.forEach((op, i) => {
      angleMap.set(op.id, (i / sortedOpinions.length) * 2 * Math.PI);
    });
    return angleMap;
  }
  
  // Step 1: Find the pair with maximum disagreement (deterministic tie-breaker)
  let maxDisagreement = -1;
  let anchorPair: [string, string] | null = null;
  
  // Sort ratings for deterministic iteration
  const sortedRatings = [...ratings].sort((a, b) => {
    const keyA = [a.opinionA, a.opinionB].sort().join('-');
    const keyB = [b.opinionA, b.opinionB].sort().join('-');
    return keyA.localeCompare(keyB);
  });
  
  for (const r of sortedRatings) {
    if (r.disagreement > maxDisagreement) {
      maxDisagreement = r.disagreement;
      // Deterministic ordering of the pair
      anchorPair = [r.opinionA, r.opinionB].sort() as [string, string];
    }
  }
  
  if (!anchorPair) {
    // Fallback: use first two active nodes sorted by ID
    const sorted = activeNodes.map(n => n.id).sort();
    anchorPair = [sorted[0], sorted[1] || sorted[0]];
  }
  
  // Place anchors at 0° and 180°
  angleMap.set(anchorPair[0], 0);
  if (anchorPair[1] !== anchorPair[0]) {
    angleMap.set(anchorPair[1], Math.PI);
  }
  
  // Step 2: Position remaining active nodes based on disagreement constraints
  const remainingActive = activeNodes
    .filter(n => !angleMap.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id)); // Deterministic order
  
  for (const node of remainingActive) {
    const connections = adjacency.get(node.id) || new Map();
    
    // Calculate weighted target angle based on connections to placed nodes
    let weightedAngleSum = 0;
    let totalWeight = 0;
    
    for (const [connectedId, disagreement] of connections) {
      if (angleMap.has(connectedId)) {
        const connectedAngle = angleMap.get(connectedId)!;
        
        // Target angle offset based on disagreement (0-100 → 0-π radians)
        const targetOffset = (disagreement / 100) * Math.PI;
        
        // We want to be targetOffset radians away from the connected node
        // Choose the direction that creates the best separation
        const candidateAngle1 = connectedAngle + targetOffset;
        const candidateAngle2 = connectedAngle - targetOffset;
        
        // Weight by disagreement (higher disagreement = stronger constraint)
        const weight = disagreement + 1; // +1 to avoid zero weight
        
        // Use the candidate that's further from already placed nodes
        const score1 = getMinAngularDistance(candidateAngle1, angleMap);
        const score2 = getMinAngularDistance(candidateAngle2, angleMap);
        
        const bestCandidate = score1 >= score2 ? candidateAngle1 : candidateAngle2;
        
        weightedAngleSum += normalizeAngle(bestCandidate) * weight;
        totalWeight += weight;
      }
    }
    
    let finalAngle: number;
    
    if (totalWeight > 0) {
      // Use weighted average of target angles
      finalAngle = weightedAngleSum / totalWeight;
    } else {
      // No connections to placed nodes - find the largest gap
      finalAngle = findLargestGap(angleMap);
    }
    
    // Ensure we don't overlap with existing nodes (larger minimum separation for better spread)
    finalAngle = adjustForMinSeparation(finalAngle, angleMap, 0.35);
    
    angleMap.set(node.id, normalizeAngle(finalAngle));
  }
  
  // Step 3: Place inactive nodes evenly distributed around the circle
  // Sort them for determinism
  const sortedInactive = inactiveNodes.sort((a, b) => a.id.localeCompare(b.id));
  
  if (sortedInactive.length > 0) {
    // Distribute inactive nodes evenly around the circle, offset from active nodes
    // Find an initial offset angle that's in the largest gap from active nodes
    const startAngle = angleMap.size > 0 ? findLargestGap(angleMap) : 0;
    const angleStep = (2 * Math.PI) / sortedInactive.length;
    
    sortedInactive.forEach((node, index) => {
      // Calculate evenly spaced angle
      let targetAngle = normalizeAngle(startAngle + index * angleStep);
      
      // Adjust to avoid overlapping with active nodes (with smaller separation for inactive)
      targetAngle = adjustForMinSeparation(targetAngle, angleMap, 0.2);
      
      angleMap.set(node.id, targetAngle);
    });
  }
  
  return angleMap;
}

/**
 * Normalize angle to [0, 2π)
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
}

/**
 * Get minimum angular distance from an angle to any placed node
 */
function getMinAngularDistance(angle: number, placed: Map<string, number>): number {
  let minDist = Math.PI; // Start with max possible
  
  for (const placedAngle of placed.values()) {
    let dist = Math.abs(normalizeAngle(angle) - normalizeAngle(placedAngle));
    if (dist > Math.PI) dist = 2 * Math.PI - dist;
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}

/**
 * Find the angle at the center of the largest gap between placed nodes
 */
function findLargestGap(placed: Map<string, number>): number {
  if (placed.size === 0) return 0;
  if (placed.size === 1) return normalizeAngle([...placed.values()][0] + Math.PI);
  
  const angles = [...placed.values()].map(normalizeAngle).sort((a, b) => a - b);
  
  let maxGap = 0;
  let gapStart = 0;
  
  // Check gaps between consecutive angles
  for (let i = 0; i < angles.length; i++) {
    const next = (i + 1) % angles.length;
    let gap = angles[next] - angles[i];
    if (gap <= 0) gap += 2 * Math.PI; // Wrap around
    
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = angles[i];
    }
  }
  
  return normalizeAngle(gapStart + maxGap / 2);
}

/**
 * Adjust angle to maintain minimum separation from existing nodes
 * Uses larger minimum separation for better spread in the yellow zone
 */
function adjustForMinSeparation(
  angle: number, 
  placed: Map<string, number>, 
  minSep: number
): number {
  if (placed.size === 0) return angle;
  
  let adjusted = normalizeAngle(angle);
  let iterations = 0;
  const maxIterations = 50; // More iterations for better convergence
  
  while (iterations < maxIterations) {
    let tooClose = false;
    
    for (const placedAngle of placed.values()) {
      let dist = Math.abs(adjusted - normalizeAngle(placedAngle));
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      
      if (dist < minSep) {
        // Push away from this node with larger step
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
 * Map FreeMind score to radius
 * 
 * FreeMind score ranges from -5000 to +5000:
 * - Score of 0 = halfway between center and outer ring
 * - Score > 2500 = green zone (inner)
 * - Score 0-2500 = orange zone (middle)
 * - Score < 0 = red zone (outer)
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
  const maxRadius = config.pinkRadius - config.nodeRadius;
  
  let radius = minRadius + invertedScore * (maxRadius - minRadius);

  // Zone border snapping: if a node center is within nodeRadius of a
  // zone boundary, nudge it fully into the zone where >50% of it sits.
  const pad = config.nodeRadius + 2;
  const boundaries = [config.greenRadius, config.yellowRadius, config.pinkRadius];

  for (const boundary of boundaries) {
    if (Math.abs(radius - boundary) < config.nodeRadius) {
      // Node straddles this boundary — snap to the side with more area
      radius = radius < boundary
        ? boundary - pad   // center is inside → push inward
        : boundary + pad;  // center is outside → push outward
    }
  }

  // Clamp to valid range
  return Math.max(minRadius, Math.min(maxRadius, radius));
}

// (calculateGreenZoneSlotPositions removed — core zone now uses standard linear layout)

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

  // Green zone slots are no longer used (core zone uses standard layout)
  const greenZoneSlots: GreenZoneSlot[] = [];

  // Step 3: Separate active (has chats) and inactive (no chats) nodes
  const activeOpinions = opinions.filter(op => nodeScores.get(op.id)?.hasChats);
  const inactiveOpinions = opinions.filter(op => !nodeScores.get(op.id)?.hasChats);

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
  // (used for non-green-zone nodes)
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
      zone: isBridgeNode(scores.freeMindScore) ? 'green' : undefined,
    } as GraphNode;
  });

  // Step 7: Place inactive nodes on outer ring using disagreement-based angles
  const inactiveRadius = config.outerRadius - config.nodeRadius * 2;
  const inactiveNodes: GraphNode[] = inactiveOpinions.map((op) => {
    const angle = angleMap.get(op.id) || 0;

    return {
      id: op.id,
      x: config.centerX + Math.cos(angle) * inactiveRadius,
      y: config.centerY + Math.sin(angle) * inactiveRadius,
      opinion: op,
      isBridge: false,
      distanceToCenter: inactiveRadius,
      hasChats: false,
    } as GraphNode;
  });

  // Combine active and inactive nodes
  let allNodes = [...activeNodes, ...inactiveNodes];

  // Fix bot node position BEFORE collision resolution so it participates
  allNodes = allNodes.map(node => {
    if (node.opinion.authorId === BOT_USER_ID) {
      const botRadius = (config.greenRadius + config.yellowRadius) / 2;
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

  return { nodes: allNodes, edges, greenZoneSlots };
}

/**
 * Post-layout collision resolution.
 * Pushes overlapping nodes apart by adjusting angles only (never radii),
 * so nodes can never cross zone boundaries.
 */
function resolveCollisions(nodes: GraphNode[], config: LayoutConfig, iterations: number = 12, pinnedIds: Set<string> = new Set()): GraphNode[] {
  if (nodes.length < 2) return nodes;

  const VISUAL_NODE_SIZE = 48;
  const minDist = VISUAL_NODE_SIZE + 4; // 52px minimum between node centers

  // Sort by ID for deterministic processing order
  const sorted = [...nodes].map(n => ({ ...n }));
  sorted.sort((a, b) => a.id.localeCompare(b.id));

  // Convert to polar coordinates (angle + radius from center)
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
    // Gather phase: compute all angular deltas without modifying positions
    const deltas = new Array(polar.length).fill(0);
    let anyOverlap = false;

    for (let i = 0; i < polar.length; i++) {
      for (let j = i + 1; j < polar.length; j++) {
        const a = polar[i];
        const b = polar[j];

        // Compute Cartesian distance from current polar coords
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

        // Determine push direction deterministically:
        // The node with the smaller ID gets pushed in the positive angular direction
        // Pinned nodes don't move; the other node absorbs the full push
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

    // Apply phase: update all angles simultaneously
    for (let i = 0; i < polar.length; i++) {
      polar[i].angle += deltas[i];
    }
  }

  // Convert back to Cartesian and rebuild node array
  const result = sorted.map((node, i) => ({
    ...node,
    x: config.centerX + Math.cos(polar[i].angle) * polar[i].radius,
    y: config.centerY + Math.sin(polar[i].angle) * polar[i].radius,
  }));

  return result;
}

// Generate mock data for testing with diverse zone distribution and clusters
export function generateMockData(count: number = 30): { opinions: Opinion[]; ratings: ChatRating[] } {
  const opinions: Opinion[] = Array.from({ length: count }, (_, i) => ({
    id: `opinion-${i}`,
    text: `Opinion ${i + 1} about an important topic that people have different views on.`,
  }));

  const ratings: ChatRating[] = [];
  
  // Define clusters with different characteristics
  // Each cluster represents a group of opinions with similar viewpoints
  const clusterCount = 5;
  const nodesPerCluster = Math.floor(count * 0.6 / clusterCount); // 60% in clusters
  const bridgeNodeCount = Math.floor(count * 0.08); // 8% bridge builders (green zone)
  const polarizingNodeCount = Math.floor(count * 0.12); // 12% polarizing (red zone)
  const inactiveCount = count - (nodesPerCluster * clusterCount) - bridgeNodeCount - polarizingNodeCount;
  
  // Assign nodes to groups
  const bridgeNodes = opinions.slice(0, bridgeNodeCount);
  const polarizingNodes = opinions.slice(bridgeNodeCount, bridgeNodeCount + polarizingNodeCount);
  const clusterNodes: Opinion[][] = [];
  
  let startIdx = bridgeNodeCount + polarizingNodeCount;
  for (let c = 0; c < clusterCount; c++) {
    clusterNodes.push(opinions.slice(startIdx, startIdx + nodesPerCluster));
    startIdx += nodesPerCluster;
  }
  // Remaining nodes after clusters will be connected to create a complete graph
  const remainingNodes = opinions.slice(startIdx);
  
  // Helper to add rating
  const addRating = (a: string, b: string, empathy: number, disagreement: number) => {
    ratings.push({
      opinionA: a,
      opinionB: b,
      empathy: Math.round(empathy),
      disagreement: Math.round(disagreement),
    });
  };
  
  // 1. Bridge nodes: High empathy + high disagreement = high bridging score (green zone)
  // Connect bridge nodes to each other and to various clusters
  for (let i = 0; i < bridgeNodes.length; i++) {
    for (let j = i + 1; j < bridgeNodes.length; j++) {
      // High empathy (30-50), high disagreement (60-100) → bridging score > 2500
      addRating(bridgeNodes[i].id, bridgeNodes[j].id, 35 + Math.random() * 15, 70 + Math.random() * 30);
    }
    // Connect to nodes from different clusters with high empathy
    for (let c = 0; c < clusterCount; c++) {
      if (clusterNodes[c].length > 0 && Math.random() < 0.5) {
        const targetNode = clusterNodes[c][Math.floor(Math.random() * clusterNodes[c].length)];
        addRating(bridgeNodes[i].id, targetNode.id, 30 + Math.random() * 20, 50 + Math.random() * 50);
      }
    }
  }
  
  // 2. Polarizing nodes: Negative empathy + high disagreement = negative bridging score (red zone)
  for (let i = 0; i < polarizingNodes.length; i++) {
    // Connect to random nodes with hostile interactions
    const connectCount = 3 + Math.floor(Math.random() * 3);
    for (let c = 0; c < connectCount; c++) {
      const clusterIdx = Math.floor(Math.random() * clusterCount);
      if (clusterNodes[clusterIdx].length > 0) {
        const targetNode = clusterNodes[clusterIdx][Math.floor(Math.random() * clusterNodes[clusterIdx].length)];
        // Negative empathy (-50 to -20), high disagreement (70-100) → negative bridging score
        addRating(polarizingNodes[i].id, targetNode.id, -50 + Math.random() * 30, 70 + Math.random() * 30);
      }
    }
    // Some polarizing nodes fight with each other too
    if (i > 0 && Math.random() < 0.4) {
      addRating(polarizingNodes[i].id, polarizingNodes[i - 1].id, -40 + Math.random() * 20, 80 + Math.random() * 20);
    }
  }
  
  // 3. Cluster nodes: Similar opinions within cluster (low disagreement), different between clusters (high disagreement)
  for (let c = 0; c < clusterCount; c++) {
    const cluster = clusterNodes[c];
    
    // Intra-cluster connections: low disagreement, moderate empathy (yellow zone tendencies)
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        if (Math.random() < 0.5) { // Increased density for more edges
          // Low disagreement (5-30), moderate empathy (-10 to +30) → moderate bridging score
          addRating(cluster[i].id, cluster[j].id, -10 + Math.random() * 40, 5 + Math.random() * 25);
        }
      }
    }
    
    // Inter-cluster connections: higher disagreement based on cluster "distance"
    for (let otherC = c + 1; otherC < clusterCount; otherC++) {
      const otherCluster = clusterNodes[otherC];
      const clusterDistance = Math.abs(otherC - c); // 1-4 representing ideological distance
      
      // Connect some nodes between clusters - increased density
      const connectionDensity = 0.25 / clusterDistance; // More connections
      
      for (let i = 0; i < cluster.length; i++) {
        for (let j = 0; j < otherCluster.length; j++) {
          if (Math.random() < connectionDensity) {
            // Disagreement scales with cluster distance
            const baseDisagreement = 20 + clusterDistance * 20;
            // Empathy varies more widely
            const empathy = -20 + Math.random() * 50;
            addRating(cluster[i].id, otherCluster[j].id, empathy, baseDisagreement + Math.random() * 20);
          }
        }
      }
    }
  }
  
  // 4. Connect remaining nodes (previously inactive) to give them edges
  // These become yellow zone nodes with moderate scores
  for (let i = 0; i < remainingNodes.length; i++) {
    // Connect each remaining node to 2-4 random cluster nodes
    const connectCount = 2 + Math.floor(Math.random() * 3);
    const connectedClusters = new Set<number>();
    
    for (let c = 0; c < connectCount; c++) {
      const clusterIdx = Math.floor(Math.random() * clusterCount);
      connectedClusters.add(clusterIdx);
      
      if (clusterNodes[clusterIdx].length > 0) {
        const targetNode = clusterNodes[clusterIdx][Math.floor(Math.random() * clusterNodes[clusterIdx].length)];
        // Moderate empathy and disagreement for yellow zone placement
        const empathy = -5 + Math.random() * 35; // -5 to 30
        const disagreement = 30 + Math.random() * 40; // 30 to 70
        addRating(remainingNodes[i].id, targetNode.id, empathy, disagreement);
      }
    }
    
    // Also connect some remaining nodes to each other
    if (i > 0 && Math.random() < 0.3) {
      const prevNode = remainingNodes[Math.floor(Math.random() * i)];
      addRating(remainingNodes[i].id, prevNode.id, 5 + Math.random() * 25, 20 + Math.random() * 40);
    }
  }

  return { opinions, ratings };
}
