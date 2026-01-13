import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ConcentricCircles } from './ConcentricCircles';
import { GraphEdges } from './GraphEdges';
import { GraphNodes } from './GraphNodes';
import { calculateLayout, generateMockData } from '@/lib/freemind-layout';
import { GraphNode, LayoutConfig, Opinion, ChatRating } from '@/types/graph';

interface OpinionGraphProps {
  opinions?: Opinion[];
  ratings?: ChatRating[];
  currentUserId?: string | null;
  onNodeSelect?: (node: GraphNode | null) => void;
  width?: number;
  height?: number;
  useMockData?: boolean;
}

export function OpinionGraph({ 
  opinions: externalOpinions,
  ratings: externalRatings,
  currentUserId,
  onNodeSelect,
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

  // Calculate layout
  const graphData = useMemo(() => {
    return calculateLayout(opinions, ratings, config);
  }, [opinions, ratings, config]);

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
        />
        
        {/* Opinion nodes */}
        <GraphNodes
          nodes={graphData.nodes}
          config={config}
          highlightedNode={highlightedNode || selectedNode?.id}
          currentUserId={currentUserId}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
      </svg>

      {/* Selected node tooltip */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-sm shadow-xl"
        >
          <p className="text-sm text-black">{selectedNode.opinion.text}</p>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-xs text-black/60 hover:text-black transition-colors"
          >
            Close
          </button>
        </motion.div>
      )}
    </div>
  );
}
