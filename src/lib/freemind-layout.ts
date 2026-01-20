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

// Maximum number of nodes that can occupy the green zone
const MAX_GREEN_ZONE_NODES = 5;

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
    
    // Ensure we don't overlap with existing nodes (minimum separation)
    finalAngle = adjustForMinSeparation(finalAngle, angleMap, 0.15);
    
    angleMap.set(node.id, normalizeAngle(finalAngle));
  }
  
  // Step 3: Place inactive nodes evenly in remaining gaps
  const sortedInactive = inactiveNodes.sort((a, b) => a.id.localeCompare(b.id));
  
  for (const node of sortedInactive) {
    const gapAngle = findLargestGap(angleMap);
    angleMap.set(node.id, gapAngle);
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
 */
function adjustForMinSeparation(
  angle: number, 
  placed: Map<string, number>, 
  minSep: number
): number {
  if (placed.size === 0) return angle;
  
  let adjusted = normalizeAngle(angle);
  let iterations = 0;
  const maxIterations = 20;
  
  while (iterations < maxIterations) {
    let tooClose = false;
    
    for (const placedAngle of placed.values()) {
      let dist = Math.abs(adjusted - normalizeAngle(placedAngle));
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      
      if (dist < minSep) {
        // Push away from this node
        const direction = adjusted > normalizeAngle(placedAngle) ? 1 : -1;
        adjusted = normalizeAngle(adjusted + direction * 0.1);
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
  // Score of 0 should map to 0.5 (halfway)
  const normalizedScore = (freeMindScore + 5000) / 10000;
  
  // Invert: high score = closer to center
  const invertedScore = 1 - normalizedScore;
  
  // Map to radius: 0 → center, 1 → outer edge
  const minRadius = config.nodeRadius * 2;
  const maxRadius = config.outerRadius - config.nodeRadius;
  
  return minRadius + invertedScore * (maxRadius - minRadius);
}

/**
 * Calculate pentagon slot positions for the green zone
 * Returns 5 positions arranged in a pentagon pattern within the green zone
 */
function calculateGreenZoneSlotPositions(config: LayoutConfig): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const slotRadius = config.greenRadius * 0.6; // Position slots at 60% of green zone radius
  
  for (let i = 0; i < MAX_GREEN_ZONE_NODES; i++) {
    // Pentagon positions starting from top (12 o'clock) going clockwise
    // Offset by -π/2 to start from top
    const angle = (i * 2 * Math.PI / MAX_GREEN_ZONE_NODES) - Math.PI / 2;
    positions.push({
      x: config.centerX + Math.cos(angle) * slotRadius,
      y: config.centerY + Math.sin(angle) * slotRadius,
    });
  }
  
  return positions;
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

  // Step 2: Identify top 5 bridge nodes for green zone
  const bridgeNodes = opinions
    .filter(op => {
      const scores = nodeScores.get(op.id);
      return scores && scores.hasChats && isBridgeNode(scores.freeMindScore);
    })
    .map(op => ({
      opinion: op,
      freeMindScore: nodeScores.get(op.id)!.freeMindScore,
    }))
    // Sort by FreeMind score descending, then by ID for determinism
    .sort((a, b) => {
      if (b.freeMindScore !== a.freeMindScore) {
        return b.freeMindScore - a.freeMindScore;
      }
      return a.opinion.id.localeCompare(b.opinion.id);
    })
    .slice(0, MAX_GREEN_ZONE_NODES);

  // Create a set of top 5 node IDs for quick lookup
  const top5NodeIds = new Set(bridgeNodes.map(n => n.opinion.id));
  
  // Calculate pentagon positions for green zone slots
  const slotPositions = calculateGreenZoneSlotPositions(config);
  
  // Create green zone slots with occupancy info
  const greenZoneSlots: GreenZoneSlot[] = slotPositions.map((pos, i) => {
    const occupyingNode = bridgeNodes[i];
    return {
      position: i + 1,
      x: pos.x,
      y: pos.y,
      occupied: !!occupyingNode,
      nodeId: occupyingNode?.opinion.id,
    };
  });

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

  // Step 6: Position active nodes
  const activeNodes: GraphNode[] = activeOpinions.map((op) => {
    const scores = nodeScores.get(op.id)!;
    const isTop5 = top5NodeIds.has(op.id);
    
    let x: number, y: number, distanceToCenter: number;
    
    if (isTop5) {
      // Top 5 nodes get fixed pentagon positions
      const slotIndex = bridgeNodes.findIndex(n => n.opinion.id === op.id);
      const slotPos = slotPositions[slotIndex];
      x = slotPos.x;
      y = slotPos.y;
      distanceToCenter = config.greenRadius * 0.6;
    } else {
      // Non-top-5 nodes use normal positioning
      const targetRadius = scoreToRadius(scores.freeMindScore, config);
      const angle = angleMap.get(op.id) || 0;
      x = config.centerX + Math.cos(angle) * targetRadius;
      y = config.centerY + Math.sin(angle) * targetRadius;
      distanceToCenter = targetRadius;
    }

    return {
      id: op.id,
      x,
      y,
      opinion: op,
      isBridge: isBridgeNode(scores.freeMindScore),
      distanceToCenter,
      hasChats: true,
      zone: isTop5 ? 'green' : undefined, // Mark top 5 as green zone
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
  const allNodes = [...activeNodes, ...inactiveNodes];

  return { nodes: allNodes, edges, greenZoneSlots };
}

// Generate mock data for testing
export function generateMockData(count: number = 30): { opinions: Opinion[]; ratings: ChatRating[] } {
  const opinions: Opinion[] = Array.from({ length: count }, (_, i) => ({
    id: `opinion-${i}`,
    text: `Opinion ${i + 1} about an important topic that people have different views on.`,
  }));

  const ratings: ChatRating[] = [];
  
  // Create random connections (not all pairs, about 30% density)
  // Leave some nodes without any connections to test inactive state
  const activeCount = Math.floor(count * 0.7);
  
  for (let i = 0; i < activeCount; i++) {
    for (let j = i + 1; j < activeCount; j++) {
      if (Math.random() < 0.3) {
        ratings.push({
          opinionA: opinions[i].id,
          opinionB: opinions[j].id,
          // Empathy: -50 to +50
          empathy: Math.round(Math.random() * 100 - 50),
          // Disagreement: 0 to 100
          disagreement: Math.round(Math.random() * 100),
        });
      }
    }
  }

  return { opinions, ratings };
}
