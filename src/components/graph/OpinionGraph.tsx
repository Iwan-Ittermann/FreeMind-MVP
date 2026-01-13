import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ConcentricCircles } from './ConcentricCircles';
import { GraphEdges } from './GraphEdges';
import { GraphNodes } from './GraphNodes';
import { calculateLayout, generateMockData } from '@/lib/freemind-layout';
import { GraphNode, GraphEdge, LayoutConfig, Opinion, ChatRating, ChatRequest } from '@/types/graph';

interface OpinionGraphProps {
  opinions?: Opinion[];
  ratings?: ChatRating[];
  chatRequests?: ChatRequest[];
  currentUserId?: string | null;
  currentUserOpinionId?: string | null;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  width?: number;
  height?: number;
  useMockData?: boolean;
}

export function OpinionGraph({ 
  opinions: externalOpinions,
  ratings: externalRatings,
  chatRequests = [],
  currentUserId,
  currentUserOpinionId,
  onNodeSelect,
  onEdgeClick,
  width = 600,
  height = 600,
  useMockData = false,
}: OpinionGraphProps) {
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Layout configuration based on size
  const config: LayoutConfig = useMemo(() => {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = size * 0.48;

    return {
      centerX,
      centerY,
      outerRadius,
      pinkRadius: outerRadius * 0.95,
      yellowRadius: outerRadius * 0.75,
      greenRadius: outerRadius * 0.45,
      nodeRadius: 6,
    };
  }, [width, height]);

  // Use provided data or generate mock data
  const { opinions, ratings } = useMemo(() => {
    if (useMockData || !externalOpinions || externalOpinions.length === 0) {
      return generateMockData(40);
    }
    return { 
      opinions: externalOpinions, 
      ratings: externalRatings || [] 
    };
  }, [externalOpinions, externalRatings, useMockData]);

  // Calculate layout and add chat request edges
  const graphData = useMemo(() => {
    const baseData = calculateLayout(opinions, ratings, config);
    
    // Add pending request edges
    const pendingEdges: GraphEdge[] = chatRequests
      .filter(req => req.status === 'pending')
      .map(req => ({
        source: req.requesterOpinionId,
        target: req.targetOpinionId,
        weight: 0.5,
        empathy: 0.5,
        disagreement: 0.5,
        status: 'pending' as const,
      }));

    // Mark nodes that are requesting to chat with current user
    const nodesWithRequestInfo = baseData.nodes.map(node => ({
      ...node,
      isRequester: currentUserOpinionId ? chatRequests.some(
        req => req.status === 'pending' && 
               req.requesterOpinionId === node.id && 
               req.targetOpinionId === currentUserOpinionId
      ) : false,
    }));

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
    };
  }, [opinions, ratings, config, chatRequests, currentUserOpinionId]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHighlightedNode(node?.id || null);
  }, []);

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
        
        {/* Edges between nodes */}
        <GraphEdges 
          nodes={graphData.nodes} 
          edges={graphData.edges}
          highlightedNode={highlightedNode || selectedNode?.id}
          onEdgeClick={onEdgeClick}
        />
        
        {/* Opinion nodes */}
        <GraphNodes
          nodes={graphData.nodes}
          config={config}
          highlightedNode={highlightedNode || selectedNode?.id}
          currentUserId={currentUserId}
          currentUserOpinionId={currentUserOpinionId}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
      </svg>
    </div>
  );
}
