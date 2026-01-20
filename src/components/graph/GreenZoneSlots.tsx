import { motion } from 'framer-motion';
import { GreenZoneSlot, LayoutConfig } from '@/types/graph';

interface GreenZoneSlotsProps {
  slots: GreenZoneSlot[];
  config: LayoutConfig;
}

export function GreenZoneSlots({ slots, config }: GreenZoneSlotsProps) {
  const slotRadius = config.nodeRadius * 3; // Same size as green zone nodes

  return (
    <g className="green-zone-slots">
      {slots.map((slot, index) => {
        // Only render placeholder for unoccupied slots
        if (slot.occupied) return null;

        return (
          <motion.g
            key={`slot-${slot.position}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: index * 0.1,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
          >
            {/* Dashed circle placeholder */}
            <circle
              cx={slot.x}
              cy={slot.y}
              r={slotRadius}
              fill="hsl(var(--primary) / 0.05)"
              stroke="hsl(0 0% 100% / 0.2)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="transition-all duration-300"
            />
            
            {/* Subtle inner glow */}
            <circle
              cx={slot.x}
              cy={slot.y}
              r={slotRadius * 0.6}
              fill="hsl(0 0% 100% / 0.03)"
            />
          </motion.g>
        );
      })}
    </g>
  );
}
