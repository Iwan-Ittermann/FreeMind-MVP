import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticEventToken } from '../types';

interface ArcaneEventMarkerProps {
  events: readonly SemanticEventToken[];
}

export const ArcaneEventMarker = memo(function ArcaneEventMarker({ events }: ArcaneEventMarkerProps) {
  const visible = events.slice(0, 2);

  return (
    <g className="arcane-events">
      <AnimatePresence>
        {visible.map((evt, i) => (
          <motion.circle
            key={`${evt.sourceId}-${evt.targetId}-${evt.timestamp}-${i}`}
            r={4}
            fill="#FFD54F"
            stroke="#C4A04A"
            strokeWidth={1}
            initial={{ cx: evt.sourceX, cy: evt.sourceY, opacity: 0.8, scale: 1 }}
            animate={{
              cx: evt.targetX,
              cy: evt.targetY,
              opacity: [0.8, 1, 0],
              scale: [1, 1.3, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        ))}
      </AnimatePresence>
    </g>
  );
});
