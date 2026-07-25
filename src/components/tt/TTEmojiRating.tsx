import { cn } from '@/lib/utils';

/**
 * 11-step opinion-difference meter (0%, 10%, ..., 100%).
 * Maps to 0–100 (0 = no difference, 100 = full difference).
 */
const STEPS = Array.from({ length: 11 }, (_, i) => i * 10);

interface TTEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
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

export function TTEmojiRating({ value, onChange, disabled }: TTEmojiRatingProps) {
  const activeIdx = nearestIndex(value);

  return (
    <div className="grid w-full grid-cols-11 gap-0.5" role="radiogroup" aria-label="Opinion difference">
      {STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        // Gradient from agreement (green-ish) to difference (rose-ish) using semantic tokens
        const intensity = step / 100;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cn(
              'h-7 min-w-0 rounded-full border px-0.5 text-[9px] font-semibold transition-all',
              'border-border bg-muted text-foreground',
              isActive
                ? 'scale-110 opacity-100 shadow-md ring-2 ring-foreground/30 bg-primary text-primary-foreground border-primary'
                : 'opacity-60 hover:opacity-90',
              disabled && 'cursor-not-allowed opacity-30',
            )}
            style={
              isActive
                ? undefined
                : { opacity: 0.4 + intensity * 0.4 }
            }
            aria-label={`${step}%`}
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
