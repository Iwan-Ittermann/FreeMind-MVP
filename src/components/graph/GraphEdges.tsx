import { GraphNode, GraphEdge } from '@/types/graph';

interface GraphEdgesProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNode?: string | null;
  onEdgeClick?: (edge: GraphEdge) => void;
}

export function GraphEdges({ nodes, edges, highlightedNode, onEdgeClick }: GraphEdgesProps) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <g className="graph-edges">
      {edges.map((edge, index) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (!source || !target) return null;

        const isHighlighted = highlightedNode && 
          (edge.source === highlightedNode || edge.target === highlightedNode);
        
        const isConnectedToHighlight = highlightedNode && isHighlighted;
        const shouldDim = highlightedNode && !isConnectedToHighlight;

        // Style based on status and empathy/disagreement
        const isPending = edge.status === 'pending';
        const opacity = shouldDim ? 0.15 : (isHighlighted ? 1 : isPending ? 0.7 : 0.35 + edge.empathy * 0.3);
        const strokeWidth = isHighlighted ? 3.5 : isPending ? 2.5 : 2;
        
        // Dashed line for pending requests OR high disagreement
        const strokeDasharray = isPending ? "6 4" : edge.disagreement > 0.6 ? "4 2" : "none";
        
        // Color: yellow/gold for pending, brighter white for accepted
        const stroke = isPending 
          ? "hsl(var(--accent))"
          : edge.empathy > 0.7 
            ? "hsl(0 0% 100%)" 
            : "hsl(0 0% 90%)";

        return (
          <line
            key={`edge-${index}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeDasharray={strokeDasharray}
            className={`transition-all duration-300 ${onEdgeClick ? 'cursor-pointer hover:stroke-[3px]' : ''}`}
            onClick={() => onEdgeClick?.(edge)}
          />
        );
      })}
    </g>
  );
}
