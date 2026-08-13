import { cn } from '@/lib/utils';

/**
 * 5-step opinion-difference meter on the 0–10 scale (0, 2, 5, 8, 10).
 * 0 = no difference, 10 = full difference.
 */
const STEPS = [0, 2, 5, 8, 10];

interface TTEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Show as unselected until the user picks a step. */
  unset?: boolean;
}

function nearestIndex(value: number): number {
  let best = 0;
  let bestDist = Infinity;
  STEPS.forEach((step, i) => {
    const d = Math.abs(step - value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function TTEmojiRating({ value, onChange, disabled, unset = false }: TTEmojiRatingProps) {
  const activeIdx = unset ? -1 : nearestIndex(value);

  return (
    <div className="grid w-full grid-cols-5 gap-1.5" role="radiogroup" aria-label="Opinion difference">
      {STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        const intensity = step / 10;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cn(
              'h-10 min-w-0 rounded-xl border px-1 text-xs font-semibold transition-all',
              'border-border bg-muted text-foreground',
              isActive
                ? 'scale-105 opacity-100 shadow-md ring-2 ring-foreground/30 bg-primary text-primary-foreground border-primary'
                : 'opacity-70 hover:opacity-100',
              disabled && 'cursor-not-allowed opacity-30',
            )}
            style={isActive ? undefined : { opacity: 0.55 + intensity * 0.35 }}
            aria-label={`${step}`}
            aria-checked={isActive}
            role="radio"
          >
            <span className="block truncate">{step}</span>
          </button>
        );
      })}
    </div>
  );
}
