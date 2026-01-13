import { motion } from 'framer-motion';
import { GraphNode, LayoutConfig } from '@/types/graph';

interface GraphNodesProps {
  nodes: GraphNode[];
  config: LayoutConfig;
  highlightedNode?: string | null;
  currentUserId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export function GraphNodes({ 
  nodes, 
  config, 
  highlightedNode,
  currentUserId,
  onNodeClick, 
  onNodeHover 
}: GraphNodesProps) {
  const { nodeRadius } = config;

  return (
    <g className="graph-nodes">
      {nodes.map((node, index) => {
        const isHighlighted = highlightedNode === node.id;
        const isCurrentUser = currentUserId && node.opinion.authorId === currentUserId;
        const shouldDim = highlightedNode && !isHighlighted;

        // Node color based on state
        const fillColor = isHighlighted 
          ? "hsl(var(--secondary))" // Blue when highlighted
          : isCurrentUser
            ? "hsl(var(--primary))" // Primary color for current user
            : "hsl(0 0% 100%)"; // White normally
        
        const strokeColor = isCurrentUser
          ? "hsl(var(--primary))"
          : node.isBridge 
            ? "hsl(var(--accent))" // Yellow stroke for bridge nodes
            : "hsl(0 0% 100% / 0.3)";

        return (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: shouldDim ? 0.3 : 1, 
              scale: 1,
              x: node.x,
              y: node.y,
            }}
            transition={{ 
              delay: index * 0.02,
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
            style={{ cursor: 'pointer' }}
            onClick={() => onNodeClick?.(node)}
            onMouseEnter={() => onNodeHover?.(node)}
            onMouseLeave={() => onNodeHover?.(null)}
          >
            {/* Outer glow for highlighted nodes */}
            {isHighlighted && (
              <circle
                r={nodeRadius * 2.5}
                fill="hsl(var(--secondary) / 0.3)"
                className="animate-pulse"
              />
            )}

            {/* Outer glow for current user's node */}
            {isCurrentUser && !isHighlighted && (
              <circle
                r={nodeRadius * 2}
                fill="hsl(var(--primary) / 0.3)"
                className="animate-pulse"
              />
            )}
            
            {/* Main node circle */}
            <circle
              r={isHighlighted ? nodeRadius * 1.5 : isCurrentUser ? nodeRadius * 1.3 : nodeRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isCurrentUser ? 2 : node.isBridge ? 2 : 1}
              className="transition-all duration-200"
            />
            
            {/* Bridge node indicator */}
            {node.isBridge && !isHighlighted && (
              <circle
                r={nodeRadius * 0.4}
                fill="hsl(var(--accent))"
              />
            )}
          </motion.g>
        );
      })}
    </g>
  );
}
