import { cn } from '@/lib/utils';

/**
 * 5-emoji disagreement picker. Maps faces to the 0–100 scale used by
 * `opinion_ratings.disagreement` (0 = full agreement, 100 = full disagreement).
 *
 * Index → value:  0:0  1:25  2:50  3:75  4:100
 */
const VALUES = [0, 25, 50, 75, 100] as const;
const FACES = ['😀', '🙂', '😐', '🙁', '😠'];
const COLORS = [
  'hsl(140 65% 55%)', // green
  'hsl(90 60% 55%)',  // light green
  'hsl(50 80% 60%)',  // yellow
  'hsl(25 80% 60%)',  // orange
  'hsl(0 75% 60%)',   // red
];

interface TTEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function nearestIndex(value: number): number {
  let best = 0;
  let bestDist = Infinity;
  VALUES.forEach((v, i) => {
    const d = Math.abs(v - value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function TTEmojiRating({ value, onChange, disabled }: TTEmojiRatingProps) {
  const activeIdx = nearestIndex(value);

  return (
    <div className="flex items-center justify-between gap-1.5 w-full">
      {FACES.map((face, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(VALUES[i])}
            className={cn(
              'flex-1 aspect-square rounded-full flex items-center justify-center text-2xl transition-all',
              'border',
              isActive
                ? 'scale-110 shadow-md border-foreground/40'
                : 'border-transparent opacity-70 hover:opacity-100',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
            style={{
              backgroundColor: isActive ? COLORS[i] : `${COLORS[i]}33`,
            }}
            aria-label={`Rate ${VALUES[i]}`}
            aria-pressed={isActive}
          >
            {face}
          </button>
        );
      })}
    </div>
  );
}
