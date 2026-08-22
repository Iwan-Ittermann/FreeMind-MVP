import { useMemo, useCallback, useRef } from 'react';
import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat, MessageAnimationData } from '@/hooks/useTopicData';
import { tokenizeNodes, tokenizeEdge, tokenizeZones } from '../tokenizer';
import { SemanticNodeToken, SemanticEdgeToken, SemanticEventToken } from '../types';
import { SignalZones } from './SignalZones';
import { SignalEdge } from './SignalEdge';
import { SignalNode } from './SignalNode';
import { SignalEventMarker } from './SignalEventMarker';
import { useHidePendingEdges } from '../ThemeContext';
import { TTLandmarks, getTTLevelRadii } from '@/lib/tt-layout';
import { SignalChatArrows } from './SignalChatArrows';
import type { ChatArrow } from '@/hooks/useChatArrows';
import { useBackgroundPref } from '@/hooks/useBackgroundPref';




interface SignalRendererProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: LayoutConfig;
  width: number;
  height: number;
  highlightedNode: string | null;
  currentUserId: string | null;
  currentUserOpinionId: string | null;
  activeChats: ActiveChat[];
  messageAnimations: MessageAnimationData[];
  onNodeClick: (node: GraphNode | null) => void;
  onNodeHover: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  showLabels?: 'none' | 'highlighted-only';
  highlightAllNodes?: boolean;
  /** When false, omit SignalZones (dark core + atmospheric glows). */
  showZones?: boolean;
  /** TT mode: gold core stars, emerald middle circles, small black extreme nodes. */
  ttMode?: boolean;
  /** TT level rings will be drawn when these landmarks are provided. */
  ttLandmarks?: TTLandmarks;
  /** When provided, chats render as short directional arrows instead of edges. */
  chatArrows?: readonly ChatArrow[];
}

export function SignalRenderer({
  nodes, edges, config, width, height,
  highlightedNode, currentUserId, currentUserOpinionId,
  activeChats, messageAnimations,
  onNodeClick, onNodeHover, onEdgeClick,
  showLabels = 'highlighted-only',
  highlightAllNodes = false,
  showZones = true,
  ttMode = false,
  ttLandmarks,
  chatArrows,
}: SignalRendererProps) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const { bgStyle } = useBackgroundPref();
  const [hidePendingEdges] = useHidePendingEdges();


  const nodeTokens: readonly SemanticNodeToken[] = useMemo(
    () => tokenizeNodes(nodes, config, edges, currentUserId, currentUserOpinionId),
    [nodes, config, edges, currentUserId, currentUserOpinionId],
  );

  const edgeTokens: readonly SemanticEdgeToken[] = useMemo(
    () => {
      const all = edges.map(e => tokenizeEdge(e, nodeMap, activeChats));
      return hidePendingEdges ? all.filter(e => !e.isPending) : all;
    },
    [edges, nodeMap, activeChats, hidePendingEdges],
  );

  const zoneTokens = useMemo(() => tokenizeZones(config), [config]);



  const eventTokens: readonly SemanticEventToken[] = useMemo(() => {
    return messageAnimations.map(anim => {
      const source = nodeMap.get(anim.sourceOpinionId);
      const target = nodeMap.get(anim.targetOpinionId);
      return Object.freeze({
        eventType: 'rating-complete' as const,
        sourceId: anim.sourceOpinionId,
        targetId: anim.targetOpinionId,
        sourceX: source?.x ?? 0,
        sourceY: source?.y ?? 0,
        targetX: target?.x ?? 0,
        targetY: target?.y ?? 0,
        timestamp: anim.timestamp,
      });
    });
  }, [messageAnimations, nodeMap]);

  const handleNodeClick = useCallback(
    (id: string, event?: React.MouseEvent<SVGGElement> | React.PointerEvent<SVGGElement>) => {
      event?.stopPropagation();
      const node = nodeMap.get(id);
      if (node) onNodeClick(node);
    },
    [nodeMap, onNodeClick],
  );

  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();
  const handleNodeHover = useCallback(
    (id: string | null) => {
      clearTimeout(hoverTimeout.current);
      if (id === null) {
        hoverTimeout.current = setTimeout(() => onNodeHover(null), 80);
      } else {
        onNodeHover(nodeMap.get(id) ?? null);
      }
    },
    [nodeMap, onNodeHover],
  );

  const handleEdgeClick = useCallback(
    (sourceId: string, targetId: string) => {
      if (!onEdgeClick) return;
      const edge = edges.find(
        e => (e.source === sourceId && e.target === targetId) ||
             (e.source === targetId && e.target === sourceId),
      );
      if (edge) onEdgeClick(edge);
    },
    [edges, onEdgeClick],
  );

  // Determine which nodes show speech bubbles based on showLabels mode
  const shouldShowBubble = useCallback((nodeId: string) => {
    if (showLabels === 'none') return false;
    // 'highlighted-only': show only for highlighted node and current user
    return nodeId === highlightedNode || nodeId === currentUserOpinionId;
  }, [showLabels, highlightedNode, currentUserOpinionId]);

  const nodeScale = ttMode ? (config.nodeRadius / 6) * 1.6 : config.nodeRadius / 6;

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
    >
      <rect width={width} height={height} fill="transparent" onClick={() => onNodeClick(null)} />
      {showZones && <SignalZones zones={zoneTokens} config={config} />}

      {ttLandmarks && (
        <g className="tt-level-rings" pointerEvents="none">
          {getTTLevelRadii(ttLandmarks)
            // Cosmos background keeps exactly one orientation line outside the
            // zero-point radius (drawn by TTBackground), so drop the outer rings.
            .filter(({ r }) => bgStyle !== 'cosmos' || r <= ttLandmarks.blueR)
            .map(({ level, r }) => (
            <circle
              key={level}
              cx={config.centerX}
              cy={config.centerY}
              r={r}
              fill="none"
              stroke="white"
              strokeOpacity={0.2}
              strokeWidth={0.75}
            />
          ))}
        </g>
      )}


      {chatArrows ? (
        <SignalChatArrows
          arrows={chatArrows}
          nodeMap={nodeMap}
          nodeRadius={config.nodeRadius}
          highlightedNode={highlightedNode}
          onArrowClick={handleEdgeClick}
        />
      ) : (
      <g className="signal-edges">
        {edgeTokens.map((et, i) => (
          <SignalEdge
            key={i}
            token={et}
            isHighlighted={!!(highlightedNode && (et.sourceId === highlightedNode || et.targetId === highlightedNode))}
            isDimmed={!highlightedNode || (et.sourceId !== highlightedNode && et.targetId !== highlightedNode)}
            onClick={() => handleEdgeClick(et.sourceId, et.targetId)}
          />
        ))}
      </g>
      )}
      <g className="signal-nodes">
        {nodeTokens.map(nt => (
          <SignalNode
            key={nt.id}
            token={nt}
            isHighlighted={highlightedNode === nt.id}
            isDimmed={!!(highlightedNode && highlightedNode !== nt.id)}


            highlightForTour={highlightAllNodes}
            showSpeechBubble={shouldShowBubble(nt.id)}
            scale={nodeScale}
            ttMode={ttMode}
            graphSize={width}
            onClick={(event) => handleNodeClick(nt.id, event)}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseEnter={() => handleNodeHover(nt.id)}
            onMouseLeave={() => handleNodeHover(null)}
          />
        ))}
      </g>
      <SignalEventMarker events={eventTokens} />
    </svg>
  );
}
