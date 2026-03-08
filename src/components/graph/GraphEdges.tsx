import { GraphNode, GraphEdge } from '@/types/graph';
import { ActiveChat } from '@/hooks/useTopicData';
import { useHidePendingEdges } from '@/themes/ThemeContext';

interface GraphEdgesProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNode?: string | null;
  activeChats?: ActiveChat[];
  onEdgeClick?: (edge: GraphEdge) => void;
}

export function GraphEdges({ nodes, edges, highlightedNode, activeChats = [], onEdgeClick }: GraphEdgesProps) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const [hidePendingEdges] = useHidePendingEdges();

  const filteredEdges = hidePendingEdges ? edges.filter(e => e.status !== 'pending') : edges;

  // Check if an edge has recent activity
  const isEdgeActive = (source: string, target: string) => {
    return activeChats.some(chat => 
      (chat.opinionAId === source && chat.opinionBId === target) ||
      (chat.opinionAId === target && chat.opinionBId === source)
    );
  };

  return (
    <g className="graph-edges">
      {/* Define the pulse animation filter */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {filteredEdges.map((edge, index) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (!source || !target) return null;

        const isHighlighted = highlightedNode && 
          (edge.source === highlightedNode || edge.target === highlightedNode);
        
        const isConnectedToHighlight = highlightedNode && isHighlighted;
        const shouldDim = highlightedNode && !isConnectedToHighlight;
        const isActive = isEdgeActive(edge.source, edge.target);

        // Style based on status and empathy/disagreement
        const isPending = edge.status === 'pending';
        const opacity = shouldDim ? 0.15 : (isHighlighted ? 1 : isActive ? 0.9 : isPending ? 0.7 : 0.35 + edge.empathy * 0.3);
        const strokeWidth = isHighlighted ? 3.5 : isActive ? 3 : isPending ? 2.5 : 2;
        
        // Dashed line ONLY for pending requests, solid for accepted
        const strokeDasharray = isPending ? "6 4" : "none";
        
        // Active edges get a brighter color
        const stroke = isActive 
          ? "hsl(var(--primary))" 
          : "hsl(var(--foreground))";

        return (
          <g key={`edge-${index}`}>
            {/* Glow effect for active edges */}
            {isActive && (
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="hsl(var(--primary))"
                strokeWidth={6}
                strokeOpacity={0.4}
                filter="url(#glow)"
                className="animate-pulse"
              />
            )}
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={strokeDasharray}
              className={`transition-all duration-300 ${onEdgeClick ? 'cursor-pointer hover:stroke-[3px]' : ''} ${isActive ? 'animate-pulse' : ''}`}
              onClick={() => onEdgeClick?.(edge)}
            />
          </g>
        );
      })}
    </g>
  );
}
