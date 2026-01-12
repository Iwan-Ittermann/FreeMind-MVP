import { GraphNode, GraphEdge } from '@/types/graph';

interface GraphEdgesProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNode?: string | null;
}

export function GraphEdges({ nodes, edges, highlightedNode }: GraphEdgesProps) {
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

        // Style based on empathy/disagreement
        const opacity = shouldDim ? 0.05 : (isHighlighted ? 0.8 : 0.15 + edge.empathy * 0.2);
        const strokeWidth = isHighlighted ? 2 : 1;
        
        // Dashed line for high disagreement
        const strokeDasharray = edge.disagreement > 0.6 ? "4 2" : "none";
        
        // Color: white for normal, slightly colored for high empathy
        const stroke = edge.empathy > 0.7 
          ? "hsl(0 0% 100%)" 
          : "hsl(0 0% 80%)";

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
            className="transition-all duration-300"
          />
        );
      })}
    </g>
  );
}
