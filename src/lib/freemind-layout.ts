/**
 * FreeMind Layout Algorithm
 * 
 * A simplified TypeScript implementation of the Polarizer layout algorithm.
 * Positions nodes based on their empathy and disagreement scores.
 * 
 * Key concepts:
 * - Nodes with high empathy + low disagreement → center (green zone)
 * - Nodes with moderate scores → middle (yellow zone)
 * - Nodes with low empathy or high disagreement → outer (pink zone)
 * - "Bridge" nodes (high empathy + high disagreement) get special positioning
 */

import { GraphNode, GraphEdge, GraphData, ChatRating, Opinion, LayoutConfig } from '@/types/graph';

// Calculate the "polarizer score" - determines distance from center
function calculatePolarizerScore(
  nodeId: string,
  ratings: ChatRating[]
): { avgEmpathy: number; avgDisagreement: number; score: number } {
  const nodeRatings = ratings.filter(
    r => r.opinionA === nodeId || r.opinionB === nodeId
  );

  if (nodeRatings.length === 0) {
    return { avgEmpathy: 0.5, avgDisagreement: 0.5, score: 0.5 };
  }

  const avgEmpathy = nodeRatings.reduce((sum, r) => sum + r.empathy, 0) / nodeRatings.length;
  const avgDisagreement = nodeRatings.reduce((sum, r) => sum + r.disagreement, 0) / nodeRatings.length;

  // Score: high empathy and low disagreement = closer to center (lower score)
  // Formula: weighted combination where empathy pulls toward center, disagreement pushes away
  const score = (1 - avgEmpathy) * 0.5 + avgDisagreement * 0.5;

  return { avgEmpathy, avgDisagreement, score };
}

// Check if node is a "bridge" - high empathy but also high disagreement
function isBridgeNode(avgEmpathy: number, avgDisagreement: number): boolean {
  return avgEmpathy > 0.6 && avgDisagreement > 0.6;
}

// Simple spectral clustering approximation using edge weights
function clusterNodes(
  opinions: Opinion[],
  ratings: ChatRating[],
  numClusters: number = 4
): Map<string, number> {
  const clusters = new Map<string, number>();
  
  // Build adjacency based on high empathy connections
  const connections = new Map<string, Set<string>>();
  
  opinions.forEach(op => connections.set(op.id, new Set()));
  
  ratings.forEach(r => {
    if (r.empathy > 0.5) {
      connections.get(r.opinionA)?.add(r.opinionB);
      connections.get(r.opinionB)?.add(r.opinionA);
    }
  });

  // Simple greedy clustering
  let currentCluster = 0;
  const assigned = new Set<string>();

  opinions.forEach(op => {
    if (assigned.has(op.id)) return;

    // Start new cluster with this node
    const clusterMembers = [op.id];
    assigned.add(op.id);
    clusters.set(op.id, currentCluster);

    // Add connected nodes to same cluster
    const queue = [...(connections.get(op.id) || [])];
    while (queue.length > 0 && clusterMembers.length < Math.ceil(opinions.length / numClusters)) {
      const nodeId = queue.shift()!;
      if (!assigned.has(nodeId)) {
        assigned.add(nodeId);
        clusters.set(nodeId, currentCluster);
        clusterMembers.push(nodeId);
      }
    }

    currentCluster = (currentCluster + 1) % numClusters;
  });

  return clusters;
}

// Force-directed layout step
function applyForces(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig
): GraphNode[] {
  const updated = nodes.map(n => ({ ...n }));
  
  const repulsionStrength = 500;
  const attractionStrength = 0.01;
  const centerPull = 0.02;

  // Apply forces
  for (let i = 0; i < updated.length; i++) {
    let fx = 0, fy = 0;

    // Repulsion from other nodes
    for (let j = 0; j < updated.length; j++) {
      if (i === j) continue;
      const dx = updated[i].x - updated[j].x;
      const dy = updated[i].y - updated[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      if (dist < 50) {
        fx += (dx / dist) * repulsionStrength / (dist * dist);
        fy += (dy / dist) * repulsionStrength / (dist * dist);
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      if (edge.source !== updated[i].id && edge.target !== updated[i].id) return;
      
      const otherId = edge.source === updated[i].id ? edge.target : edge.source;
      const other = updated.find(n => n.id === otherId);
      if (!other) return;

      const dx = other.x - updated[i].x;
      const dy = other.y - updated[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Stronger attraction for high empathy edges
      const strength = attractionStrength * (1 + edge.empathy);
      fx += dx * strength;
      fy += dy * strength;
    });

    // Pull toward target radius based on score
    const targetRadius = updated[i].distanceToCenter || config.yellowRadius;
    const currentDist = Math.sqrt(
      Math.pow(updated[i].x - config.centerX, 2) + 
      Math.pow(updated[i].y - config.centerY, 2)
    );
    
    if (currentDist > 0) {
      const dx = (config.centerX - updated[i].x) / currentDist;
      const dy = (config.centerY - updated[i].y) / currentDist;
      const radiusDiff = currentDist - targetRadius;
      fx += dx * radiusDiff * centerPull;
      fy += dy * radiusDiff * centerPull;
    }

    // Apply forces with damping
    updated[i].x += fx * 0.1;
    updated[i].y += fy * 0.1;

    // Keep within bounds
    const dist = Math.sqrt(
      Math.pow(updated[i].x - config.centerX, 2) + 
      Math.pow(updated[i].y - config.centerY, 2)
    );
    if (dist > config.outerRadius - config.nodeRadius) {
      const angle = Math.atan2(updated[i].y - config.centerY, updated[i].x - config.centerX);
      updated[i].x = config.centerX + Math.cos(angle) * (config.outerRadius - config.nodeRadius);
      updated[i].y = config.centerY + Math.sin(angle) * (config.outerRadius - config.nodeRadius);
    }
  }

  return updated;
}

// Main layout function
export function calculateLayout(
  opinions: Opinion[],
  ratings: ChatRating[],
  config: LayoutConfig
): GraphData {
  // Step 1: Calculate scores for each node
  const nodeScores = new Map<string, { avgEmpathy: number; avgDisagreement: number; score: number }>();
  opinions.forEach(op => {
    nodeScores.set(op.id, calculatePolarizerScore(op.id, ratings));
  });

  // Step 2: Cluster nodes
  const clusters = clusterNodes(opinions, ratings);

  // Step 3: Initial placement based on score (radial)
  const nodes: GraphNode[] = opinions.map((op, index) => {
    const scores = nodeScores.get(op.id)!;
    const cluster = clusters.get(op.id) || 0;

    // Map score to radius (0 = center, 1 = edge)
    const minRadius = config.greenRadius * 0.5;
    const maxRadius = config.outerRadius - config.nodeRadius;
    const targetRadius = minRadius + scores.score * (maxRadius - minRadius);

    // Distribute angle based on cluster and index
    const clusterAngleOffset = (cluster / 4) * Math.PI * 2;
    const nodeAngle = clusterAngleOffset + (index * 0.3);

    const x = config.centerX + Math.cos(nodeAngle) * targetRadius;
    const y = config.centerY + Math.sin(nodeAngle) * targetRadius;

    return {
      id: op.id,
      x,
      y,
      opinion: op,
      cluster,
      isBridge: isBridgeNode(scores.avgEmpathy, scores.avgDisagreement),
      distanceToCenter: targetRadius,
    };
  });

  // Step 4: Create edges from ratings
  const edges: GraphEdge[] = ratings.map(r => ({
    source: r.opinionA,
    target: r.opinionB,
    weight: r.empathy * (1 - r.disagreement * 0.5),
    empathy: r.empathy,
    disagreement: r.disagreement,
  }));

  // Step 5: Apply force-directed refinement (multiple iterations)
  let refinedNodes = nodes;
  for (let i = 0; i < 50; i++) {
    refinedNodes = applyForces(refinedNodes, edges, config);
  }

  return { nodes: refinedNodes, edges };
}

// Generate mock data for testing
export function generateMockData(count: number = 30): { opinions: Opinion[]; ratings: ChatRating[] } {
  const opinions: Opinion[] = Array.from({ length: count }, (_, i) => ({
    id: `opinion-${i}`,
    text: `Opinion ${i + 1} about an important topic that people have different views on.`,
  }));

  const ratings: ChatRating[] = [];
  
  // Create random connections (not all pairs, about 30% density)
  for (let i = 0; i < opinions.length; i++) {
    for (let j = i + 1; j < opinions.length; j++) {
      if (Math.random() < 0.3) {
        ratings.push({
          opinionA: opinions[i].id,
          opinionB: opinions[j].id,
          empathy: Math.random(),
          disagreement: Math.random(),
        });
      }
    }
  }

  return { opinions, ratings };
}
