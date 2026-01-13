import { motion, AnimatePresence } from 'framer-motion';
import { GraphNode } from '@/types/graph';
import { MessageAnimationData } from '@/hooks/useTopicData';

interface MessageDotsProps {
  nodes: GraphNode[];
  messageAnimations: MessageAnimationData[];
}

export function MessageDots({ nodes, messageAnimations }: MessageDotsProps) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <g className="message-dots">
      <AnimatePresence>
        {messageAnimations.map((anim) => {
          const source = nodeMap.get(anim.sourceOpinionId);
          const target = nodeMap.get(anim.targetOpinionId);

          if (!source || !target) return null;

          return (
            <motion.circle
              key={anim.id}
              r={4}
              fill="hsl(var(--primary))"
              filter="url(#glow)"
              initial={{ 
                cx: source.x, 
                cy: source.y,
                opacity: 1,
                scale: 1.5
              }}
              animate={{ 
                cx: target.x, 
                cy: target.y,
                opacity: [1, 1, 0],
                scale: [1.5, 1, 0.5]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.8,
                ease: "easeInOut",
                opacity: { times: [0, 0.8, 1] },
                scale: { times: [0, 0.5, 1] }
              }}
            />
          );
        })}
      </AnimatePresence>
    </g>
  );
}
