import { useState, useMemo, useCallback } from 'react';
import { ConcentricCircles } from './ConcentricCircles';
import { GraphEdges } from './GraphEdges';
import { GraphNodes } from './GraphNodes';
import { GreenZoneSlots } from './GreenZoneSlots';
import { MessageDots } from './MessageDots';
import { calculateLayout, generateMockData } from '@/lib/freemind-layout';
import { GraphNode, GraphEdge, LayoutConfig, Opinion, ChatRating, ChatRequest, GreenZoneSlot } from '@/types/graph';
import { ActiveChat, MessageAnimationData } from '@/hooks/useTopicData';
import { useFreeMindTheme } from '@/themes/ThemeContext';
import { CityRenderer } from '@/themes/city/CityRenderer';
import { ArcaneRenderer } from '@/themes/arcane/ArcaneRenderer';
import { SignalRenderer } from '@/themes/signal/SignalRenderer';

interface OpinionGraphProps {
  opinions?: Opinion[];
  ratings?: ChatRating[];
  chatRequests?: ChatRequest[];
  activeChats?: ActiveChat[];
  messageAnimations?: MessageAnimationData[];
  currentUserId?: string | null;
  currentUserOpinionId?: string | null;
  onlineOpinionIds?: Set<string>;
  unreadMessageCounts?: Map<string, number>;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  width?: number;
  height?: number;
  useMockData?: boolean;
  selectedNodeId?: string | null;
  showLabels?: 'none' | 'highlighted-only';
}

export function OpinionGraph({ 
  opinions: externalOpinions,
  ratings: externalRatings,
  chatRequests = [],
  activeChats = [],
  messageAnimations = [],
  currentUserId,
  currentUserOpinionId,
  onlineOpinionIds = new Set(),
  unreadMessageCounts = new Map(),
  onNodeSelect,
  onEdgeClick,
  width = 600,
  height = 600,
  useMockData = false,
  selectedNodeId = null,
}: OpinionGraphProps) {
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  // Layout configuration based on size
  // Adjusted zone sizes: narrower green/pink, wider yellow
  const config: LayoutConfig = useMemo(() => {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = size * 0.48;

    return {
      centerX,
      centerY,
      outerRadius,
      pinkRadius: outerRadius * 0.92,  // Narrower pink (was 0.95)
      yellowRadius: outerRadius * 0.80, // Wider yellow (was 0.75)
      greenRadius: outerRadius * 0.25,  // Core zone at 25%
      nodeRadius: 6,
    };
  }, [width, height]);

  // Use provided data or generate mock data (only when explicitly requested)
  const { opinions, ratings } = useMemo(() => {
    if (useMockData) {
      return generateMockData(100);
    }
    if (!externalOpinions || externalOpinions.length === 0) {
      return { opinions: [], ratings: [] };
    }
    return { 
      opinions: externalOpinions, 
      ratings: externalRatings || [] 
    };
  }, [externalOpinions, externalRatings, useMockData]);

  // Calculate layout and add chat request edges
  const graphData = useMemo(() => {
    const baseData = calculateLayout(opinions, ratings, config);
    
    // Add pending request edges (only show edges involving the current user)
    const pendingEdges: GraphEdge[] = chatRequests
      .filter(req => req.status === 'pending' && currentUserOpinionId && (
        req.requesterOpinionId === currentUserOpinionId || req.targetOpinionId === currentUserOpinionId
      ))
      .map(req => ({
        source: req.requesterOpinionId,
        target: req.targetOpinionId,
        weight: 0.5,
        empathy: 0.5,
        disagreement: 0.5,
        status: 'pending' as const,
      }));

    // Mark nodes with request info, online status, and unread messages
    const nodesWithRequestInfo = baseData.nodes.map(node => {
      const unreadCount = unreadMessageCounts.get(node.id) || 0;
      return {
        ...node,
        isRequester: currentUserOpinionId ? chatRequests.some(
          req => req.status === 'pending' && 
                 req.requesterOpinionId === node.id && 
                 req.targetOpinionId === currentUserOpinionId
        ) : false,
        isOnline: onlineOpinionIds.has(node.id),
        hasUnreadMessages: unreadCount > 0,
        unreadCount,
      };
    });

    // Combine edges, avoiding duplicates (accepted takes priority)
    const acceptedPairs = new Set(
      baseData.edges.map(e => [e.source, e.target].sort().join('-'))
    );
    const uniquePendingEdges = pendingEdges.filter(e => 
      !acceptedPairs.has([e.source, e.target].sort().join('-'))
    );

    return {
      nodes: nodesWithRequestInfo,
      edges: [...baseData.edges, ...uniquePendingEdges],
      greenZoneSlots: baseData.greenZoneSlots,
    };
  }, [opinions, ratings, config, chatRequests, currentUserOpinionId, onlineOpinionIds, unreadMessageCounts]);

  const handleNodeClick = useCallback((node: GraphNode | null) => {
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHighlightedNode(node?.id || null);
  }, []);

  const theme = useFreeMindTheme();

  if (theme === 'city' || theme === 'arcane' || theme === 'signal') {
    const Renderer = theme === 'signal' ? SignalRenderer : theme === 'arcane' ? ArcaneRenderer : CityRenderer;
    return (
      <div className="relative">
        <Renderer
          nodes={graphData.nodes}
          edges={graphData.edges}
          config={config}
          width={width}
          height={height}
          highlightedNode={highlightedNode || selectedNodeId || null}
          currentUserId={currentUserId || null}
          currentUserOpinionId={currentUserOpinionId || null}
          activeChats={activeChats}
          messageAnimations={messageAnimations}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onEdgeClick={onEdgeClick}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <svg 
        width={width} 
        height={height}
        className="overflow-visible"
        style={{ filter: 'drop-shadow(0 0 40px hsl(var(--primary) / 0.2))' }}
      >
        {/* Background */}
        <rect width={width} height={height} fill="transparent" />
        
        {/* Concentric colored circles */}
        <ConcentricCircles config={config} />
        
        {/* Green zone placeholder slots */}
        <GreenZoneSlots slots={graphData.greenZoneSlots} config={config} />
        
        {/* Edges between nodes */}
        <GraphEdges 
          nodes={graphData.nodes} 
          edges={graphData.edges}
          highlightedNode={highlightedNode || selectedNodeId}
          activeChats={activeChats}
          onEdgeClick={onEdgeClick}
        />
        
        {/* Opinion nodes */}
        <GraphNodes
          nodes={graphData.nodes}
          config={config}
          highlightedNode={highlightedNode || selectedNodeId}
          currentUserId={currentUserId}
          currentUserOpinionId={currentUserOpinionId}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
        
        {/* Message animation dots (on top of nodes) */}
        <MessageDots 
          nodes={graphData.nodes}
          messageAnimations={messageAnimations}
        />
      </svg>
    </div>
  );
}
