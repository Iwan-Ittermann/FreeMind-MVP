import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticEventToken } from '../types';
import type { MessageAnimationData } from '@/hooks/useTopicData';
import { GRAPH_ANIMATION, respectTone, truncateAtWord } from '@/lib/graph-animation';

interface SignalEventMarkerProps {
  events: readonly SemanticEventToken[];
  messageAnimations?: readonly MessageAnimationData[];
}

export const SignalEventMarker = memo(function SignalEventMarker({ events, messageAnimations = [] }: SignalEventMarkerProps) {
  const visible = events.slice(-GRAPH_ANIMATION.maxVisibleEvents);
  const dataByKey = new Map(messageAnimations.map(item => [`${item.sourceOpinionId}-${item.targetOpinionId}-${item.timestamp}`, item]));

  return (
    <g className="signal-events">
      <AnimatePresence>
        {visible.map((evt, i) => {
          const key = `${evt.sourceId}-${evt.targetId}-${evt.timestamp}`;
          const item = dataByKey.get(key);
          const rating = item?.kind === 'rating';
          const tone = respectTone(item?.respect);
          const color = tone === 'low' ? 'hsl(var(--destructive))' : tone === 'high' ? 'hsl(var(--success))' : 'hsl(var(--accent-warm))';
          const duration = (item?.durationMs ?? GRAPH_ANIMATION.messageMinMs) / 1000;
          const text = item?.content ? truncateAtWord(item.content, 92) : '';
          const bubbleX = evt.targetX >= evt.sourceX ? 0 : -150;
          return <motion.g key={`${key}-${i}`} pointerEvents="none">
          <motion.line x1={evt.sourceX} y1={evt.sourceY} x2={evt.targetX} y2={evt.targetY}
            stroke={rating ? color : 'hsl(var(--primary))'} strokeWidth={rating ? 5 : 3} strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }} transition={{ duration }} />
          <motion.circle
            r={rating ? 7 : 4}
            fill={rating ? color : 'hsl(var(--primary))'}
            stroke={rating ? color : 'hsl(var(--primary))'
            }
            strokeWidth={1}
            initial={{ cx: evt.sourceX, cy: evt.sourceY, opacity: 0.9, scale: 1 }}
            animate={{
              cx: evt.targetX,
              cy: evt.targetY,
              opacity: [0.9, 1, 0],
              scale: [1, 1.5, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: 'easeInOut' }}
          />
          {!rating && text && (
            <motion.g
              initial={{ x: evt.sourceX, y: evt.sourceY, opacity: 0 }}
              animate={{ x: evt.targetX, y: evt.targetY, opacity: [0, 1, 1, 0] }}
              transition={{ duration, ease: 'easeInOut' }}
            >
              <foreignObject width={150} height={46} x={bubbleX} y={-46}>
                <div className="line-clamp-2 rounded-md border border-primary/50 bg-card/95 px-2 py-1 text-center text-[9px] leading-tight text-card-foreground shadow-md">{text}</div>
              </foreignObject>
            </motion.g>
          )}
          </motion.g>;
        })}
      </AnimatePresence>
    </g>
  );
});
