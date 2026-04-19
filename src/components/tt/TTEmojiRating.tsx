import { cn } from '@/lib/utils';

/**
 * Compact 5-step disagreement picker using naturally-colored circle emojis.
 * Maps to 0–100 (0 = full agreement, 100 = full disagreement).
 *
 * Index → value:  0:0  1:25  2:50  3:75  4:100
 */
const VALUES = [0, 25, 50, 75, 100] as const;
// Native colored circles — no backdrop needed
const ICONS = ['🟢', '🟡', '🟠', '🔴', '⚫'];

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
    <div className="flex items-center gap-1">
      {ICONS.map((icon, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(VALUES[i])}
            className={cn(
              'text-base leading-none transition-all p-0.5',
              isActive ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-90',
              disabled && 'opacity-30 cursor-not-allowed',
            )}
            aria-label={`Rate ${VALUES[i]}`}
            aria-pressed={isActive}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
