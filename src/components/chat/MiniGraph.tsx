import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTopicData } from '@/hooks/useTopicData';
import { calculateLayout } from '@/lib/freemind-layout';
import { LayoutConfig } from '@/types/graph';

interface MiniGraphProps {
  topicId: string;
  myOpinionId?: string;
  theirOpinionId?: string;
  size?: number;
}

export function MiniGraph({ 
  topicId, 
  myOpinionId, 
  theirOpinionId,
  size = 120 
}: MiniGraphProps) {
  const { data: topicData, isLoading } = useTopicData(topicId);

  const config: LayoutConfig = useMemo(() => {
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size * 0.45;

    return {
      centerX,
      centerY,
      outerRadius,
      pinkRadius: outerRadius * 0.95,
      yellowRadius: outerRadius * 0.75,
      greenRadius: outerRadius * 0.45,
      nodeRadius: 3,
    };
  }, [size]);

  const graphData = useMemo(() => {
    if (!topicData?.opinions || topicData.opinions.length === 0) {
      return { nodes: [], edges: [] };
    }
    return calculateLayout(topicData.opinions, topicData.ratings || [], config);
  }, [topicData, config]);

  if (isLoading) {
    return (
      <div 
        className="rounded-full bg-white/5 animate-pulse flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="w-4 h-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg 
        width={size} 
        height={size}
        className="overflow-visible"
      >
        {/* Concentric circles - simplified */}
        <circle
          cx={config.centerX}
          cy={config.centerY}
          r={config.pinkRadius}
          fill="none"
          stroke="hsl(var(--primary) / 0.15)"
          strokeWidth={1}
        />
        <circle
          cx={config.centerX}
          cy={config.centerY}
          r={config.yellowRadius}
          fill="none"
          stroke="hsl(45, 100%, 50%, 0.15)"
          strokeWidth={1}
        />
        <circle
          cx={config.centerX}
          cy={config.centerY}
          r={config.greenRadius}
          fill="none"
          stroke="hsl(142, 76%, 36%, 0.2)"
          strokeWidth={1}
        />

        {/* Edges */}
        {graphData.edges.map((edge, i) => {
          const sourceNode = graphData.nodes.find(n => n.id === edge.source);
          const targetNode = graphData.nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          
          const isHighlighted = 
            (edge.source === myOpinionId && edge.target === theirOpinionId) ||
            (edge.source === theirOpinionId && edge.target === myOpinionId);

          return (
            <line
              key={i}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.1)'}
              strokeWidth={isHighlighted ? 1.5 : 0.5}
            />
          );
        })}

        {/* Nodes */}
        {graphData.nodes.map((node) => {
          const isMe = node.id === myOpinionId;
          const isThem = node.id === theirOpinionId;
          const isHighlighted = isMe || isThem;
          const isInactive = node.hasChats === false;

          let fillColor = 'hsl(var(--primary) / 0.6)';
          if (isMe) fillColor = 'hsl(142, 76%, 45%)'; // Green for me
          if (isThem) fillColor = 'hsl(var(--primary))'; // Primary for them
          if (isInactive && !isHighlighted) fillColor = 'hsl(var(--primary) / 0.2)';

          return (
            <motion.circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={isHighlighted ? 4 : 2.5}
              fill={fillColor}
              stroke={isHighlighted ? 'white' : 'transparent'}
              strokeWidth={isHighlighted ? 1 : 0}
              initial={false}
              animate={{
                cx: node.x,
                cy: node.y,
                r: isHighlighted ? 4 : 2.5,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-3 text-[8px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Them
        </span>
      </div>
    </motion.div>
  );
}
