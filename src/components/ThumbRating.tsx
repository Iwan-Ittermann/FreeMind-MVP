import { motion } from 'framer-motion';

interface ThumbRatingProps {
  /** Disagreement value 0-100. 0 = full agreement (thumb up), 100 = full disagreement (thumb down). */
  value: number;
  size?: number;
}

/**
 * Reactive thumb visual driven by the disagreement slider.
 * Front-view thumb that rotates: 0 = thumb up, 50 = sideways, 100 = thumb down.
 * Color shifts from accent (agree) → muted (neutral) → destructive (disagree).
 */
export function ThumbRating({ value, size = 44 }: ThumbRatingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  // Invert: 0 (agree) → 0deg (up), 100 (disagree) → 180deg (down)
  const rotate = (clamped / 100) * 180;

  const colorClass =
    clamped <= 33
      ? 'bg-accent/15 text-accent border-accent/40'
      : clamped <= 66
      ? 'bg-muted text-muted-foreground border-border'
      : 'bg-destructive/15 text-destructive border-destructive/40';

  const iconSize = size * 0.6;

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`flex items-center justify-center rounded-full border ${colorClass}`}
        style={{ width: size, height: size }}
        animate={{ rotate }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        aria-hidden
      >
        {/* Front-view thumbs-up SVG (hand facing viewer, thumb extended up). */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Thumb (extended upward) */}
          <path d="M26 30 V14 a4 4 0 0 1 8 0 v16" />
          {/* Index finger */}
          <path d="M26 30 H42 a4 4 0 0 1 0 8 H30" />
          {/* Middle finger */}
          <path d="M30 38 H42 a4 4 0 0 1 0 8 H30" />
          {/* Ring finger */}
          <path d="M30 46 H40 a4 4 0 0 1 0 8 H30" />
          {/* Pinky / palm base */}
          <path d="M22 30 V52 a4 4 0 0 0 4 4 h12" />
          {/* Knuckle line on thumb */}
          <path d="M28 22 q2 -1 4 0" opacity="0.6" />
        </svg>
      </motion.div>
    </div>
  );
}
