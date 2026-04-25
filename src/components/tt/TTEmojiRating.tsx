import { cn } from '@/lib/utils';

/**
 * Responsive 5-step disagreement picker.
 * Maps to 0–100 (0 = full agreement, 100 = full disagreement).
 */
const OPTIONS = [
  { label: 'Yes!', value: 0, className: 'tt-disagree-yes-strong' },
  { label: 'Yes', value: 25, className: 'tt-disagree-yes' },
  { label: 'Neutral', value: 50, className: 'tt-disagree-neutral' },
  { label: 'No', value: 75, className: 'tt-disagree-no' },
  { label: 'No!', value: 100, className: 'tt-disagree-no-strong' },
] as const;

interface TTEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function nearestIndex(value: number): number {
  let best = 0;
  let bestDist = Infinity;
  OPTIONS.forEach((option, i) => {
    const d = Math.abs(option.value - value);
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
    <div className="grid w-full grid-cols-5 gap-1" role="radiogroup" aria-label="Disagreement rating">
      {OPTIONS.map((option, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 min-w-0 rounded-full border px-1 text-[10px] font-semibold transition-all',
              option.className,
              isActive ? 'scale-105 opacity-100 shadow-md ring-2 ring-foreground/20' : 'opacity-55 hover:opacity-90',
              disabled && 'cursor-not-allowed opacity-30',
            )}
            aria-label={option.label}
            aria-checked={isActive}
            role="radio"
          >
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
