import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { GraphNode, LayoutConfig } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';

interface GraphNodesProps {
  nodes: GraphNode[];
  config: LayoutConfig;
  highlightedNode?: string | null;
  currentUserId?: string | null;
  currentUserOpinionId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

// Determine which zone a node is in based on zone property or distance from center
function getNodeZone(node: GraphNode, config: LayoutConfig): 'respectful' | 'moderate' | 'extreme' | 'outer' {
  if (node.zone === 'respectful') return 'respectful';
  
  const dist = node.distanceToCenter || config.outerRadius;
  
  if (dist <= config.moderateRadius) return 'moderate';
  if (dist <= config.extremeRadius) return 'extreme';
  return 'outer';
}

// Get size multiplier based on zone
function getZoneSizeMultiplier(zone: 'respectful' | 'moderate' | 'extreme' | 'outer'): number {
  switch (zone) {
    case 'respectful': return 3;
    case 'moderate': return 2;
    case 'extreme': return 1;
    case 'outer': return 0.7;
  }
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

  const handleClick = useCallback((node: GraphNode) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  return (
    <g className="graph-nodes">
      {nodes.map((node, index) => {
        const isHighlighted = highlightedNode === node.id;
        const isCurrentUser = currentUserId && node.opinion.authorId === currentUserId;
        const isBot = node.opinion.authorId === BOT_USER_ID;
        const shouldDim = highlightedNode && !isHighlighted;
        const hasIncomingRequest = node.isRequester; // This node sent a request TO current user
        const isInactive = node.hasChats === false; // Node has no chats yet
        const isHidden = node.opinion.visible === false;
        const hasUnreadMessages = node.hasUnreadMessages;
        const isOnline = node.isOnline && !isCurrentUser; // Don't show online indicator for own node

        // Get zone-based sizing
        const zone = getNodeZone(node, config);
        const zoneMultiplier = getZoneSizeMultiplier(zone);
        const baseRadius = nodeRadius * zoneMultiplier;

        // Node color based on state - enhanced contrast
        let fillColor: string;
        let strokeColor: string;

        if (isBot) {
          fillColor = "hsl(270 70% 60%)"; // Purple for bot
          strokeColor = "hsl(270 70% 70%)";
        } else if (isHidden) {
          fillColor = "hsl(0 0% 30%)";
          strokeColor = "hsl(0 70% 50%)";
        } else if (isHighlighted) {
          fillColor = "hsl(0 0% 100%)"; // White when highlighted
          strokeColor = "hsl(0 0% 100% / 0.8)"; // Subtle white stroke
        } else if (isCurrentUser) {
          fillColor = "hsl(var(--primary))"; // Primary color for current user
          strokeColor = "hsl(var(--primary))";
        } else if (isInactive) {
          fillColor = "hsl(0 0% 70%)"; // Lighter grey for inactive nodes (was too dim)
          strokeColor = "hsl(0 0% 80%)";
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
              opacity: shouldDim ? 0.5 : isHidden ? 0.4 : 1, // Dim hidden nodes more
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
            onClick={() => handleClick(node)}
            onMouseEnter={() => onNodeHover?.(node)}
            onMouseLeave={() => onNodeHover?.(null)}
          >
            {/* Outer glow for highlighted nodes - subtle white */}
            {isHighlighted && (
              <circle
                r={baseRadius * 2}
                fill="hsl(0 0% 100% / 0.15)"
              />
            )}

            {/* Outer glow for current user's node */}
            {isCurrentUser && !isHighlighted && (
              <circle
                r={baseRadius * 2}
                fill="hsl(var(--primary) / 0.3)"
                className="animate-pulse"
              />
            )}

            {/* ENHANCED: Stronger visual for nodes with pending requests to current user */}
            {hasIncomingRequest && !isHighlighted && !isCurrentUser && (
              <>
                {/* Outer pulsing ring - larger and more prominent */}
                <motion.circle
                  r={baseRadius * 3}
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth={3}
                  initial={{ opacity: 0.3, scale: 0.8 }}
                  animate={{ 
                    opacity: [0.3, 0.8, 0.3], 
                    scale: [0.9, 1.1, 0.9] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                {/* Inner filled glow */}
                <circle
                  r={baseRadius * 2.2}
                  fill="hsl(var(--accent) / 0.15)"
                  stroke="hsl(var(--accent))"
                  strokeWidth={1.5}
                />
                {/* Notification badge */}
                <g transform={`translate(${baseRadius * 1.5}, ${-baseRadius * 1.5})`}>
                  <circle r={7} fill="hsl(var(--accent))" />
                  <text 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    className="text-[9px] fill-black font-bold pointer-events-none"
                  >
                    !
                  </text>
                </g>
              </>
            )}
            
            {/* Unread message notification badge - small white count badge at top-right */}
            {hasUnreadMessages && !hasIncomingRequest && !isHighlighted && !isCurrentUser && (
              <g transform={`translate(${baseRadius * 1.2}, ${-baseRadius * 1.2})`}>
                {/* Background circle */}
                <circle 
                  r={6} 
                  fill="hsl(0 0% 100%)"
                  stroke="hsl(0 0% 0%)"
                  strokeWidth={1}
                />
                {/* Count text */}
                <text 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  className="text-[7px] fill-black font-bold pointer-events-none select-none"
                >
                  {node.unreadCount && node.unreadCount > 9 ? '9+' : (node.unreadCount || '!')}
                </text>
              </g>
            )}
            
            {/* Main node circle */}
            <circle
              r={isHighlighted ? baseRadius * 1.5 : isCurrentUser ? baseRadius * 1.3 : baseRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isCurrentUser || hasIncomingRequest ? 2 : node.isBridge ? 2 : 1}
              className="transition-all duration-200"
            />
            
            {/* Bridge node indicator - dot for non-green-zone bridge nodes */}
            {node.isBridge && !isHighlighted && !isHidden && zone !== 'green' && (
              <circle
                r={baseRadius * 0.4}
                fill="hsl(var(--accent))"
              />
            )}

            {/* Online presence indicator - small green pulsating dot INSIDE node (rendered after main circle) */}
            {isOnline && !isHighlighted && !hasIncomingRequest && !isCurrentUser && (
              <motion.circle
                r={baseRadius * 0.35}
                fill="hsl(153 96% 43%)"
                initial={{ opacity: 0.6, scale: 0.9 }}
                animate={{ 
                  opacity: [0.5, 1, 0.5], 
                  scale: [0.9, 1.1, 0.9] 
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}

            {/* Hidden content indicator */}
            {isHidden && isCurrentUser && (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[8px] fill-destructive font-bold pointer-events-none"
              >
                !
              </text>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}
