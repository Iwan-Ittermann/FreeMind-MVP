import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';

interface ThumbRatingProps {
  /** Disagreement value 0-100. 0 = full agreement (thumb up), 100 = full disagreement (thumb down). */
  value: number;
  size?: number;
}

/**
 * Reactive thumb visual driven by the disagreement slider.
 * Rotates the thumb so it points up at 0, sideways at 50, down at 100.
 * Color shifts from accent (agree) → muted (neutral) → destructive (disagree).
 */
export function ThumbRating({ value, size = 44 }: ThumbRatingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const rotate = (clamped / 100) * 180;

  // Discrete color tier for clear semantics.
  const colorClass =
    clamped <= 33
      ? 'bg-accent/15 text-accent border-accent/40'
      : clamped <= 66
      ? 'bg-muted text-muted-foreground border-border'
      : 'bg-destructive/15 text-destructive border-destructive/40';

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`flex items-center justify-center rounded-full border ${colorClass}`}
        style={{ width: size, height: size }}
        animate={{ rotate }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <ThumbsUp style={{ width: size * 0.5, height: size * 0.5 }} />
      </motion.div>
    </div>
  );
}
