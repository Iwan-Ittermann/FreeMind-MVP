// FreeMind Graph Types

export interface Opinion {
  id: string;
  text: string;
  authorId?: string;
  createdAt?: Date;
  status?: 'Visible' | 'Reported-Unreviewed' | 'In-Review' | 'Soft-Deleted';
  visible?: boolean;
  noticeText?: string;
}

export interface ChatRating {
  opinionA: string;
  opinionB: string;
  empathy: number; // -50 to +50 scale (internally stored as integer)
  disagreement: number; // 0-100 scale (internally stored as integer)
  isSynthetic?: boolean; // true for disagreement-only entries (no chat) — excluded from radial score
}

export interface OpinionRating {
  raterOpinionId: string;
  targetOpinionId: string;
  disagreement: number; // 0-100
}

export interface ChatRequest {
  id: string;
  requesterOpinionId: string;
  targetOpinionId: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  opinion: Opinion;
  cluster?: number;
  clusterColor?: string;
  isBridge?: boolean;
  distanceToCenter?: number;
  hasPendingRequest?: boolean; // This node has a pending incoming request
  isRequester?: boolean; // This node sent a pending request to current user
  hasChats?: boolean; // Whether this node has participated in any chats
  zone?: 'respectful' | 'moderate' | 'extreme'; // Which zone the node is in
  hasUnreadMessages?: boolean; // Has unread messages from this node
  unreadCount?: number; // Number of unread messages
  isOnline?: boolean; // Whether the user behind this opinion is currently online
  level?: number; // Discrete scale level 1-10
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // Combined score from ratings
  empathy: number;
  disagreement: number;
  status: 'pending' | 'accepted'; // Edge type for visual styling
}

export interface RespectfulZoneSlot {
  position: number;  // 1-5
  x: number;
  y: number;
  occupied: boolean;
  nodeId?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  respectfulZoneSlots: RespectfulZoneSlot[];
}

export interface LayoutConfig {
  centerX: number;
  centerY: number;
  outerRadius: number;
  respectfulRadius: number; // Inner circle (consensus zone) — formerly greenRadius
  moderateRadius: number; // Middle ring — formerly yellowRadius
  extremeRadius: number; // Outer ring — formerly pinkRadius
  nodeRadius: number;
}
