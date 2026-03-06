import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat, MessageAnimationData } from '@/hooks/useTopicData';
import { tokenizeNodes, tokenizeEdge, tokenizeZones } from '../tokenizer';
import { SemanticNodeToken, SemanticEdgeToken, SemanticEventToken } from '../types';
import { SignalZones } from './SignalZones';
import { SignalEdge } from './SignalEdge';
import { SignalNode } from './SignalNode';
import { SignalEventMarker } from './SignalEventMarker';
import { useAppSetting } from '@/hooks/useAppSettings';
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
}

const ZONE_PRIORITY: Record<string, number> = { core: 0, middle: 1, outer: 2, inactive: 3 };

export function SignalRenderer({
  nodes, edges, config, width, height,
  highlightedNode, currentUserId, currentUserOpinionId,
  activeChats, messageAnimations,
  onNodeClick, onNodeHover, onEdgeClick,
}: SignalRendererProps) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const { data: maxBubblesSetting } = useAppSetting('max_speech_bubbles');
  const maxBubbles = parseInt(maxBubblesSetting?.value || '15', 10);
  const [hidePendingEdges] = useHidePendingEdges();

  const nodeTokens: readonly SemanticNodeToken[] = useMemo(
    () => tokenizeNodes(nodes, config, edges, currentUserId, currentUserOpinionId),
    [nodes, config, edges, currentUserId, currentUserOpinionId],
  );

  // Rolling label rotation: show 5 at a time, swap 2 every 3s
  const [visibleLabelIds, setVisibleLabelIds] = useState<Set<string>>(new Set());
  const allNodeIds = useMemo(() => nodeTokens.map(n => n.id), [nodeTokens]);

  useEffect(() => {
    if (allNodeIds.length <= 5) {
      setVisibleLabelIds(new Set(allNodeIds));
      return;
    }
    // Initialize with first 5 (excluding current user which is always shown)
    const nonUserIds = allNodeIds.filter(id => id !== currentUserOpinionId);
    setVisibleLabelIds(new Set(nonUserIds.slice(0, 5)));

    const interval = setInterval(() => {
      setVisibleLabelIds(prev => {
        const currentVisible = Array.from(prev);
        const currentHidden = nonUserIds.filter(id => !prev.has(id));
        if (currentHidden.length === 0) return prev;

        const next = new Set(prev);
        // Remove up to 2 random visible ones
        const shuffledVisible = [...currentVisible].sort(() => Math.random() - 0.5);
        const toRemove = shuffledVisible.slice(0, Math.min(2, currentHidden.length));
        toRemove.forEach(id => next.delete(id));
        // Add up to 2 random hidden ones
        const shuffledHidden = [...currentHidden].sort(() => Math.random() - 0.5);
        shuffledHidden.slice(0, 2).forEach(id => next.add(id));
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [allNodeIds, currentUserOpinionId]);

  const speechBubbleIds = useMemo(() => {
    const base = new Set(visibleLabelIds);
    // Always show current user's node
    if (currentUserOpinionId) base.add(currentUserOpinionId);
    // Always show highlighted node
    if (highlightedNode) base.add(highlightedNode);
    return base;
  }, [visibleLabelIds, currentUserOpinionId, highlightedNode]);

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
        timestamp: Date.now(),
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
            isDimmed={!!(highlightedNode && et.sourceId !== highlightedNode && et.targetId !== highlightedNode)}
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
            showSpeechBubble={speechBubbleIds.has(nt.id)}
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
