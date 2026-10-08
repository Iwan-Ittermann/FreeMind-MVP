import { useMemo, useCallback, useRef } from 'react';
import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat, MessageAnimationData, OpinionAnimationData } from '@/hooks/useTopicData';
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
import type { SpiralPoint } from '@/lib/stream-spiral';
import { SPIRAL_MAX_R, STREAM_ARM_COUNT, STREAM_ARM_TURNS, spiralArmPosition } from '@/lib/stream-spiral';
import { useWediumPresentation } from '@/contexts/WediumPresentationContext';

/** Daten für die Stream-Spirale (Einheitsraum, Zentrum 0/0, blauer Ring = 300). */
export interface StreamSpiralOverlay {
  points: SpiralPoint[];
  currentIndex: number;
  /** Einheitsraum-Position des gefeaturten Nodes. */
  focus: { x: number; y: number } | null;
}




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
  opinionAnimations: OpinionAnimationData[];
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
  /** Stream-Spirale: gepunktete Linie, leuchtender aktueller Punkt, Linie zum Node. */
  streamSpiral?: StreamSpiralOverlay;
}

export function SignalRenderer({
  nodes, edges, config, width, height,
  highlightedNode, currentUserId, currentUserOpinionId,
  activeChats, messageAnimations, opinionAnimations,
  onNodeClick, onNodeHover, onEdgeClick,
  showLabels = 'highlighted-only',
  highlightAllNodes = false,
  showZones = true,
  ttMode = false,
  ttLandmarks,
  chatArrows,
  streamSpiral,
}: SignalRendererProps) {
  const wedium = useWediumPresentation();
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
  const freshOpinionById = useMemo(
    () => new Map(opinionAnimations.map(event => [event.opinionId, event])),
    [opinionAnimations],
  );

  return (
    <svg
      width={width}
      height={height}
      className={ttMode ? 'overflow-visible' : 'overflow-hidden'}
      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
    >
      <rect width={width} height={height} fill="transparent" onClick={() => onNodeClick(null)} />
      {showZones && <SignalZones zones={zoneTokens} config={config} />}

      {ttLandmarks && (
        <g className="tt-level-rings" pointerEvents="none">
          {getTTLevelRadii(ttLandmarks)
            // Cosmos background keeps exactly one orientation line outside the
            // zero-point radius (drawn by TTBackground), so drop the outer rings.
            // Wedium presentation: double ring density, slightly thicker stroke.
            .filter(({ level, r }) => wedium ? [1, 3, 5, 7, 9, 10].includes(level) : bgStyle !== 'cosmos' || r <= ttLandmarks.blueR)
            .map(({ level, r }) => (
            <circle
              key={level}
              cx={config.centerX}
              cy={config.centerY}
              r={r}
              fill="none"
               stroke="hsl(var(--foreground))"
              strokeOpacity={wedium ? 0.25 : 0.2}
              strokeWidth={wedium ? 1 : 0.75}
            />
          ))}
        </g>
      )}


      {/* Edges always render (hidden until hover); arrows layer on top of them. */}
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
      {chatArrows && (
        <SignalChatArrows
          arrows={chatArrows}
          nodeMap={nodeMap}
          nodeRadius={config.nodeRadius}
          highlightedNode={highlightedNode}
          onArrowClick={handleEdgeClick}
          liveEvents={messageAnimations}
        />
      )}

      {/* Draw all six arms even with only a few candidates. */}
      {!wedium && streamSpiral && ttLandmarks && streamSpiral.points.length > 0 && (
        <g className="stream-spiral" pointerEvents="none">
          {(() => {
            const scale = ttLandmarks.blueR / SPIRAL_MAX_R;
            const toPx = (u: { x: number; y: number }) => ({
              x: config.centerX + u.x * scale,
              y: config.centerY + u.y * scale,
            });
            const first = streamSpiral.points[0];
            const rotation = first
              ? Math.atan2(first.y, first.x)
                - (2 * Math.PI * first.arm) / STREAM_ARM_COUNT
                - 2 * Math.PI * STREAM_ARM_TURNS * (Math.hypot(first.x, first.y) / SPIRAL_MAX_R)
              : 0;
            const armPaths = Array.from({ length: STREAM_ARM_COUNT }, (_, arm) =>
              Array.from({ length: 81 }, (_, i) => {
                const p = toPx(spiralArmPosition(arm, i / 80, rotation));
                return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(' '),
            );
            const currentPoint = streamSpiral.points[streamSpiral.currentIndex];
            const current = currentPoint ? toPx(currentPoint) : null;
            const focus = streamSpiral.focus ? toPx(streamSpiral.focus) : null;
            return (
              <>
                {armPaths.map((path, arm) => (
                  <path key={arm} d={path} fill="none" stroke="hsl(var(--foreground))" strokeOpacity={0.95}
                    strokeWidth={2.2} strokeDasharray="1 4" strokeLinecap="round" />
                ))}
                {current && focus && (
                  <line x1={current.x} y1={current.y} x2={focus.x} y2={focus.y}
                    stroke="hsl(var(--primary))" strokeOpacity={0.8} strokeWidth={1.3}
                    strokeDasharray="3 4" />
                )}
                {current && (
                  <>
                    <circle cx={current.x} cy={current.y} r={8} fill="hsl(var(--primary))" opacity={0.4} />
                    <circle cx={current.x} cy={current.y} r={3.5} fill="hsl(var(--foreground))" />
                  </>
                )}
              </>
            );
          })()}
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
            freshOpinion={freshOpinionById.get(nt.id)}
            scale={nodeScale}
            ttMode={ttMode}
            graphWidth={width}
            graphHeight={height}
            onClick={(event) => handleNodeClick(nt.id, event)}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseEnter={() => handleNodeHover(nt.id)}
            onMouseLeave={() => handleNodeHover(null)}
          />
        ))}
      </g>
      <SignalEventMarker events={eventTokens} messageAnimations={messageAnimations} />
    </svg>
  );
}
