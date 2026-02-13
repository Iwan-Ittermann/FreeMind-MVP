import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticEventToken } from '../types';

interface CityEventMarkerProps {
  events: readonly SemanticEventToken[];
}

export const CityEventMarker = memo(function CityEventMarker({ events }: CityEventMarkerProps) {
  // Show max 2 simultaneous events
  const visible = events.slice(0, 2);

  return (
    <g className="city-events">
      <AnimatePresence>
        {visible.map((evt, i) => (
          <motion.circle
            key={`${evt.sourceId}-${evt.targetId}-${evt.timestamp}-${i}`}
            r={4}
            fill="#FFE082"
            stroke="#FFC107"
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
