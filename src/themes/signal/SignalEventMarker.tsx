import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticEventToken } from '../types';

interface SignalEventMarkerProps {
  events: readonly SemanticEventToken[];
}

export const SignalEventMarker = memo(function SignalEventMarker({ events }: SignalEventMarkerProps) {
  const visible = events.slice(0, 5);

  return (
    <g className="signal-events">
      <AnimatePresence>
        {visible.map((evt, i) => (
          <motion.circle
            key={`${evt.sourceId}-${evt.targetId}-${evt.timestamp}-${i}`}
            r={3}
            fill="#FFFFFF"
            initial={{ cx: evt.sourceX, cy: evt.sourceY, opacity: 0.9, scale: 1 }}
            animate={{
              cx: evt.targetX,
              cy: evt.targetY,
              opacity: [0.9, 1, 0],
              scale: [1, 1.5, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        ))}
      </AnimatePresence>
    </g>
  );
});
