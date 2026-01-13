import { motion } from 'framer-motion';
import { GraphNode, LayoutConfig } from '@/types/graph';

interface GraphNodesProps {
  nodes: GraphNode[];
  config: LayoutConfig;
  highlightedNode?: string | null;
  currentUserId?: string | null;
  currentUserOpinionId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export function GraphNodes({ 
  nodes, 
  config, 
  highlightedNode,
  currentUserId,
  currentUserOpinionId,
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
        const hasIncomingRequest = node.isRequester; // This node sent a request TO current user
        const isInactive = node.hasChats === false; // Node has no chats yet

        // Node color based on state - enhanced contrast
        let fillColor: string;
        let strokeColor: string;

        if (isHighlighted) {
          fillColor = "hsl(var(--secondary))"; // Blue when highlighted
          strokeColor = "hsl(var(--secondary))";
        } else if (isCurrentUser) {
          fillColor = "hsl(var(--primary))"; // Primary color for current user
          strokeColor = "hsl(var(--primary))";
        } else if (isInactive) {
          fillColor = "hsl(var(--muted-foreground) / 0.15)"; // Very dim for inactive
          strokeColor = "hsl(var(--muted-foreground) / 0.25)";
        } else if (hasIncomingRequest) {
          fillColor = "hsl(0 0% 100%)";
          strokeColor = "hsl(var(--accent))"; // Yellow for nodes requesting to chat
        } else if (node.isBridge) {
          fillColor = "hsl(0 0% 100%)";
          strokeColor = "hsl(var(--accent))"; // Yellow stroke for bridge nodes
        } else {
          fillColor = "hsl(0 0% 100%)"; // Bright white for active nodes
          strokeColor = "hsl(0 0% 100% / 0.6)";
        }

        return (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0, x: node.x, y: node.y }}
            animate={{ 
              opacity: shouldDim ? 0.3 : 1, 
              scale: 1,
              x: node.x,
              y: node.y,
            }}
            transition={{ 
              opacity: { duration: 0.3 },
              scale: { delay: index * 0.02, type: "spring", stiffness: 100, damping: 15 },
              x: { type: "spring", stiffness: 50, damping: 20, mass: 1 },
              y: { type: "spring", stiffness: 50, damping: 20, mass: 1 },
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

            {/* Glowing ring for nodes with pending requests to current user */}
            {hasIncomingRequest && !isHighlighted && !isCurrentUser && (
              <circle
                r={nodeRadius * 2.2}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                strokeOpacity={0.6}
                className="animate-pulse"
              />
            )}
            
            {/* Main node circle */}
            <circle
              r={isHighlighted ? nodeRadius * 1.5 : isCurrentUser ? nodeRadius * 1.3 : nodeRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isCurrentUser || hasIncomingRequest ? 2 : node.isBridge ? 2 : 1}
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
