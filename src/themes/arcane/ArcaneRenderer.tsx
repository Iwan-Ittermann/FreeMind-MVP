import { useMemo, useCallback, useRef } from 'react';
import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat, MessageAnimationData } from '@/hooks/useTopicData';
import { tokenizeNodes, tokenizeEdge, tokenizeZones } from '../tokenizer';
import { SemanticNodeToken, SemanticEdgeToken, SemanticEventToken } from '../types';
import { ArcaneZones } from './ArcaneZones';
import { ArcaneCluster } from './ArcaneCluster';
import { ArcaneEdge } from './ArcaneEdge';
import { ArcaneNode } from './ArcaneNode';
import { ArcaneEventMarker } from './ArcaneEventMarker';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useHidePendingEdges } from '../ThemeContext';

interface ArcaneRendererProps {
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

export function ArcaneRenderer({
  nodes, edges, config, width, height,
  highlightedNode, currentUserId, currentUserOpinionId,
  activeChats, messageAnimations,
  onNodeClick, onNodeHover, onEdgeClick,
}: ArcaneRendererProps) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const { data: maxBubblesSetting } = useAppSetting('max_speech_bubbles');
  const maxBubbles = parseInt(maxBubblesSetting?.value || '15', 10);
  const [hidePendingEdges] = useHidePendingEdges();

  const nodeTokens: readonly SemanticNodeToken[] = useMemo(
    () => tokenizeNodes(nodes, config, edges, currentUserId, currentUserOpinionId),
    [nodes, config, edges, currentUserId, currentUserOpinionId],
  );

  const speechBubbleIds = useMemo(() => {
    const sorted = [...nodeTokens].sort((a, b) =>
      (ZONE_PRIORITY[a.zone] ?? 9) - (ZONE_PRIORITY[b.zone] ?? 9)
    );
    return new Set(sorted.slice(0, maxBubbles).map(n => n.id));
  }, [nodeTokens, maxBubbles]);

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
      <rect width={width} height={height} fill="transparent" />
      <ArcaneZones zones={zoneTokens} config={config} />
      <ArcaneCluster nodes={nodeTokens} />
      <g className="arcane-edges">
        {edgeTokens.map((et, i) => (
          <ArcaneEdge
            key={i}
            token={et}
            isHighlighted={!!(highlightedNode && (et.sourceId === highlightedNode || et.targetId === highlightedNode))}
            isDimmed={!!(highlightedNode && et.sourceId !== highlightedNode && et.targetId !== highlightedNode)}
            onClick={() => handleEdgeClick(et.sourceId, et.targetId)}
          />
        ))}
      </g>
      <ArcaneEventMarker events={eventTokens} />
      <g className="arcane-nodes">
        {nodeTokens.map(nt => (
          <ArcaneNode
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
    </svg>
  );
}
