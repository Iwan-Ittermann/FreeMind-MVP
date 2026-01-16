import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GraphNode, LayoutConfig } from '@/types/graph';
import { ReportDialog } from '@/components/moderation/ReportDialog';

interface GraphNodesProps {
  nodes: GraphNode[];
  config: LayoutConfig;
  highlightedNode?: string | null;
  currentUserId?: string | null;
  currentUserOpinionId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

// Long press duration in ms
const LONG_PRESS_DURATION = 500;

// Determine which zone a node is in based on distance from center
function getNodeZone(node: GraphNode, config: LayoutConfig): 'green' | 'yellow' | 'pink' | 'outer' {
  const dist = node.distanceToCenter || config.outerRadius;
  
  if (dist <= config.greenRadius) return 'green';
  if (dist <= config.yellowRadius) return 'yellow';
  if (dist <= config.pinkRadius) return 'pink';
  return 'outer';
}

// Get size multiplier based on zone
function getZoneSizeMultiplier(zone: 'green' | 'yellow' | 'pink' | 'outer'): number {
  switch (zone) {
    case 'green': return 3;     // Triple size in green zone (center)
    case 'yellow': return 2;    // Double size in yellow zone
    case 'pink': return 1;      // Normal size in pink zone
    case 'outer': return 0.7;   // Smaller size on outer ring
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
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingNode, setReportingNode] = useState<GraphNode | null>(null);
  
  // Long press handling for touch devices
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const handleContextMenu = (e: React.MouseEvent, node: GraphNode) => {
    e.preventDefault();
    // Don't allow reporting own content
    if (node.opinion.authorId === currentUserId) return;
    setReportingNode(node);
    setReportDialogOpen(true);
  };

  const openReportDialog = useCallback((node: GraphNode) => {
    // Don't allow reporting own content
    if (node.opinion.authorId === currentUserId) return;
    setReportingNode(node);
    setReportDialogOpen(true);
  }, [currentUserId]);

  const handleTouchStart = useCallback((node: GraphNode) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      openReportDialog(node);
    }, LONG_PRESS_DURATION);
  }, [openReportDialog]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback((node: GraphNode) => {
    // Don't trigger click if long press was triggered
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    // Always allow click - hidden state is handled by Index.tsx
    onNodeClick?.(node);
  }, [onNodeClick]);

  return (
    <>
      <g className="graph-nodes">
        {nodes.map((node, index) => {
          const isHighlighted = highlightedNode === node.id;
          const isCurrentUser = currentUserId && node.opinion.authorId === currentUserId;
          const shouldDim = highlightedNode && !isHighlighted;
          const hasIncomingRequest = node.isRequester; // This node sent a request TO current user
          const isInactive = node.hasChats === false; // Node has no chats yet
          const isHidden = node.opinion.visible === false;

          // Get zone-based sizing
          const zone = getNodeZone(node, config);
          const zoneMultiplier = getZoneSizeMultiplier(zone);
          const baseRadius = nodeRadius * zoneMultiplier;

          // Node color based on state - enhanced contrast
          let fillColor: string;
          let strokeColor: string;

          if (isHidden) {
            fillColor = "hsl(0 0% 30%)"; // Dark grey for hidden content
            strokeColor = "hsl(0 70% 50%)"; // Red tint stroke
          } else if (isHighlighted) {
            fillColor = "hsl(var(--secondary))"; // Blue when highlighted
            strokeColor = "hsl(var(--secondary))";
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
              onContextMenu={(e) => handleContextMenu(e, node)}
              onTouchStart={() => handleTouchStart(node)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
            >
              {/* Outer glow for highlighted nodes */}
              {isHighlighted && (
                <circle
                  r={baseRadius * 2.5}
                  fill="hsl(var(--secondary) / 0.3)"
                  className="animate-pulse"
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

              {/* Glowing ring for nodes with pending requests to current user */}
              {hasIncomingRequest && !isHighlighted && !isCurrentUser && (
                <circle
                  r={baseRadius * 2.2}
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  className="animate-pulse"
                />
              )}
              
              {/* Main node circle */}
              <circle
                r={isHighlighted ? baseRadius * 1.5 : isCurrentUser ? baseRadius * 1.3 : baseRadius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isCurrentUser || hasIncomingRequest ? 2 : node.isBridge ? 2 : 1}
                className="transition-all duration-200"
              />
              
              {/* Bridge node indicator */}
              {node.isBridge && !isHighlighted && !isHidden && (
                <circle
                  r={baseRadius * 0.4}
                  fill="hsl(var(--accent))"
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

      {/* Report Dialog */}
      {reportingNode && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={(open) => {
            setReportDialogOpen(open);
            if (!open) setReportingNode(null);
          }}
          contentId={reportingNode.id}
          contentType="Opinion"
          contentPreview={reportingNode.opinion.text}
        />
      )}
    </>
  );
}
