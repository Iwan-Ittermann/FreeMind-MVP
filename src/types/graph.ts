// FreeMind Graph Types

export interface Opinion {
  id: string;
  text: string;
  authorId?: string;
  createdAt?: Date;
}

export interface ChatRating {
  opinionA: string;
  opinionB: string;
  empathy: number; // 0-1 scale
  disagreement: number; // 0-1 scale
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  opinion: Opinion;
  cluster?: number;
  isBridge?: boolean;
  distanceToCenter?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // Combined score from ratings
  empathy: number;
  disagreement: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface LayoutConfig {
  centerX: number;
  centerY: number;
  outerRadius: number;
  greenRadius: number; // Inner circle (consensus zone)
  yellowRadius: number; // Middle ring
  pinkRadius: number; // Outer ring
  nodeRadius: number;
}
