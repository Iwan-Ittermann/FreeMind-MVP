import { useMemo, useCallback } from 'react';
import { GraphNode, GraphEdge, LayoutConfig } from '@/types/graph';
import { ActiveChat, MessageAnimationData } from '@/hooks/useTopicData';
import { tokenizeNode, tokenizeEdge, tokenizeZones } from '../tokenizer';
import { SemanticNodeToken, SemanticEdgeToken, SemanticEventToken } from '../types';
import { CityZones } from './CityZones';
import { CityCluster } from './CityCluster';
import { CityEdge } from './CityEdge';
import { CityNode } from './CityNode';
import { CityEventMarker } from './CityEventMarker';

interface CityRendererProps {
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

export function CityRenderer({
  nodes,
  edges,
  config,
  width,
  height,
  highlightedNode,
  currentUserId,
  currentUserOpinionId,
  activeChats,
  messageAnimations,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
}: CityRendererProps) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Tokenize
  const nodeTokens: readonly SemanticNodeToken[] = useMemo(
    () => nodes.map(n => tokenizeNode(n, config, edges, currentUserId, currentUserOpinionId)),
    [nodes, config, edges, currentUserId, currentUserOpinionId],
  );

  const edgeTokens: readonly SemanticEdgeToken[] = useMemo(
    () => edges.map(e => tokenizeEdge(e, nodeMap, activeChats)),
    [edges, nodeMap, activeChats],
  );

  const zoneTokens = useMemo(() => tokenizeZones(config), [config]);

  // Convert message animations to event tokens
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

  // Interaction handlers — dispatch to centralized handler with original GraphNode
  const handleNodeClick = useCallback(
    (id: string) => {
      const node = nodeMap.get(id);
      if (node) onNodeClick(node);
    },
    [nodeMap, onNodeClick],
  );

  const handleNodeHover = useCallback(
    (id: string | null) => {
      onNodeHover(id ? nodeMap.get(id) ?? null : null);
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
    <svg
      width={width}
      height={height}
      className="overflow-visible"
    >
      <rect width={width} height={height} fill="#F1F8E9" />

      {/* Zones (concentric) */}
      <CityZones zones={zoneTokens} config={config} />

      {/* Cluster backgrounds */}
      <CityCluster nodes={nodeTokens} />

      {/* Roads (beneath houses) */}
      <g className="city-edges">
        {edgeTokens.map((et, i) => (
          <CityEdge
            key={i}
            token={et}
            isHighlighted={!!(highlightedNode && (et.sourceId === highlightedNode || et.targetId === highlightedNode))}
            isDimmed={!!(highlightedNode && et.sourceId !== highlightedNode && et.targetId !== highlightedNode)}
            onClick={() => handleEdgeClick(et.sourceId, et.targetId)}
          />
        ))}
      </g>

      {/* Event markers */}
      <CityEventMarker events={eventTokens} />

      {/* Houses (above roads) */}
      <g className="city-nodes">
        {nodeTokens.map(nt => (
          <CityNode
            key={nt.id}
            token={nt}
            isHighlighted={highlightedNode === nt.id}
            isDimmed={!!(highlightedNode && highlightedNode !== nt.id)}
            onClick={() => handleNodeClick(nt.id)}
            onMouseEnter={() => handleNodeHover(nt.id)}
            onMouseLeave={() => handleNodeHover(null)}
          />
        ))}
      </g>
    </svg>
  );
}
