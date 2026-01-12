import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ConcentricCircles } from './ConcentricCircles';
import { GraphEdges } from './GraphEdges';
import { GraphNodes } from './GraphNodes';
import { calculateLayout, generateMockData } from '@/lib/freemind-layout';
import { GraphNode, LayoutConfig } from '@/types/graph';

interface OpinionGraphProps {
  onNodeSelect?: (node: GraphNode | null) => void;
  width?: number;
  height?: number;
}

export function OpinionGraph({ 
  onNodeSelect,
  width = 600,
  height = 600,
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

  // Generate mock data and calculate layout
  const graphData = useMemo(() => {
    const { opinions, ratings } = generateMockData(40);
    return calculateLayout(opinions, ratings, config);
  }, [config]);

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
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
      </svg>

      {/* Selected node tooltip */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 max-w-sm shadow-xl"
        >
          <p className="text-sm text-foreground">{selectedNode.opinion.text}</p>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </motion.div>
      )}
    </div>
  );
}
