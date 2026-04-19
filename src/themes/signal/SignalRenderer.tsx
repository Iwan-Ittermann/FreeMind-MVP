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
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  showLabels?: 'none' | 'highlighted-only';
  /** When false, omit SignalZones (dark core + atmospheric glows). */
  showZones?: boolean;
}

export function SignalRenderer({
  nodes, edges, config, width, height,
  highlightedNode, currentUserId, currentUserOpinionId,
  activeChats, messageAnimations,
  onNodeClick, onNodeHover, onEdgeClick,
  showLabels = 'highlighted-only',
  showZones = true,
}: SignalRendererProps) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
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
    (id: string) => { const node = nodeMap.get(id); if (node) onNodeClick(node); },
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

  const nodeScale = config.nodeRadius / 6;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <rect width={width} height={height} fill="transparent" onClick={() => onNodeClick(null as unknown as GraphNode)} />
      <SignalZones zones={zoneTokens} config={config} />
      
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
      <g className="signal-nodes">
        {nodeTokens.map(nt => (
          <SignalNode
            key={nt.id}
            token={nt}
            isHighlighted={highlightedNode === nt.id}
            isDimmed={!!(highlightedNode && highlightedNode !== nt.id)}
            showSpeechBubble={shouldShowBubble(nt.id)}
            scale={nodeScale}
            onClick={() => handleNodeClick(nt.id)}
            onMouseEnter={() => handleNodeHover(nt.id)}
            onMouseLeave={() => handleNodeHover(null)}
          />
        ))}
      </g>
      <SignalEventMarker events={eventTokens} />
    </svg>
  );
}
