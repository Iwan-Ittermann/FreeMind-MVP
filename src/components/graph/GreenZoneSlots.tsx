import { motion } from 'framer-motion';
import { RespectfulZoneSlot, LayoutConfig } from '@/types/graph';

interface RespectfulZoneSlotsProps {
  slots: RespectfulZoneSlot[];
  config: LayoutConfig;
}

export function GreenZoneSlots({ slots, config }: RespectfulZoneSlotsProps) {
  const slotRadius = config.nodeRadius * 3;
  return (
    <g className="respectful-zone-slots">
      {slots.map((slot, index) => {
        if (slot.occupied) return null;
        return (
          <motion.g key={`slot-${slot.position}`} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 15 }}>
            <circle cx={slot.x} cy={slot.y} r={slotRadius} fill="hsl(var(--primary) / 0.05)" stroke="hsl(0 0% 100% / 0.2)" strokeWidth={1.5} strokeDasharray="4 4" />
            <circle cx={slot.x} cy={slot.y} r={slotRadius * 0.6} fill="hsl(0 0% 100% / 0.03)" />
          </motion.g>
        );
      })}
    </g>
  );
}
