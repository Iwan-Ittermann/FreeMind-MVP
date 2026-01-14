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

import { GraphNode, GraphEdge, GraphData, ChatRating, Opinion, LayoutConfig } from '@/types/graph';

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
 * Apply repulsion forces to prevent node overlap
 */
function applyRepulsionForces(
  nodes: GraphNode[],
  config: LayoutConfig
): GraphNode[] {
  const updated = nodes.map(n => ({ ...n }));
  const repulsionStrength = 300;
  const minDistance = config.nodeRadius * 3;
  
  for (let i = 0; i < updated.length; i++) {
    let fx = 0, fy = 0;
    
    for (let j = 0; j < updated.length; j++) {
      if (i === j) continue;
      
      const dx = updated[i].x - updated[j].x;
      const dy = updated[i].y - updated[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      if (dist < minDistance) {
        fx += (dx / dist) * repulsionStrength / (dist * dist);
        fy += (dy / dist) * repulsionStrength / (dist * dist);
      }
    }
    
    // Apply forces with damping
    updated[i].x += fx * 0.1;
    updated[i].y += fy * 0.1;
    
    // Keep within bounds while maintaining radius
    const targetRadius = updated[i].distanceToCenter || config.yellowRadius;
    const currentDist = Math.sqrt(
      Math.pow(updated[i].x - config.centerX, 2) + 
      Math.pow(updated[i].y - config.centerY, 2)
    );
    
    if (currentDist > 0) {
      const angle = Math.atan2(updated[i].y - config.centerY, updated[i].x - config.centerX);
      // Constrain radius while allowing some flexibility
      const constrainedRadius = Math.max(
        config.nodeRadius * 2,
        Math.min(config.outerRadius - config.nodeRadius, targetRadius)
      );
      updated[i].x = config.centerX + Math.cos(angle) * constrainedRadius;
      updated[i].y = config.centerY + Math.sin(angle) * constrainedRadius;
    }
  }
  
  return updated;
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

  // Step 2: Separate active (has chats) and inactive (no chats) nodes
  const activeOpinions = opinions.filter(op => nodeScores.get(op.id)?.hasChats);
  const inactiveOpinions = opinions.filter(op => !nodeScores.get(op.id)?.hasChats);

  // Step 3: Create edges from ratings
  const edges: GraphEdge[] = ratings.map(r => ({
    source: r.opinionA,
    target: r.opinionB,
    weight: calculateBridgingScore(r.empathy, r.disagreement),
    empathy: r.empathy,
    disagreement: r.disagreement,
    status: 'accepted' as const,
  }));

  // Step 4: Sort all opinions by ID to ensure consistent ordering across all users
  const sortedOpinions = [...opinions].sort((a, b) => a.id.localeCompare(b.id));

  // Create a deterministic angle for each node based on its position in sorted order
  const getNodeAngle = (opinionId: string): number => {
    const sortedIndex = sortedOpinions.findIndex(op => op.id === opinionId);
    return (sortedIndex / sortedOpinions.length) * 2 * Math.PI;
  };

  // Step 5: Position active nodes based on FreeMind score
  const activeNodes: GraphNode[] = activeOpinions.map((op) => {
    const scores = nodeScores.get(op.id)!;
    
    // Calculate radius based on FreeMind score
    const targetRadius = scoreToRadius(scores.freeMindScore, config);

    // Use deterministic angle based on sorted position
    const baseAngle = getNodeAngle(op.id);

    const x = config.centerX + Math.cos(baseAngle) * targetRadius;
    const y = config.centerY + Math.sin(baseAngle) * targetRadius;

    return {
      id: op.id,
      x,
      y,
      opinion: op,
      isBridge: isBridgeNode(scores.freeMindScore),
      distanceToCenter: targetRadius,
      hasChats: true,
    } as GraphNode;
  });

  // Step 6: Place inactive nodes on outer ring (they have score of 0 = no chats)
  const inactiveRadius = config.outerRadius - config.nodeRadius * 2;
  const inactiveNodes: GraphNode[] = inactiveOpinions.map((op) => {
    const angle = getNodeAngle(op.id);

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

  // Step 7: Skip angular optimization - it causes non-deterministic layouts across users
  // The deterministic angle based on sorted ID position is sufficient
  // and ensures all users see the same graph

  // Step 8: Skip repulsion forces as they also introduce non-determinism
  // The spread of nodes based on sorted positions should be sufficient
  const refinedActiveNodes = activeNodes;
  const refinedInactiveNodes = inactiveNodes;

  // Combine active and inactive nodes
  const allNodes = [...refinedActiveNodes, ...refinedInactiveNodes];

  return { nodes: allNodes, edges };
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
