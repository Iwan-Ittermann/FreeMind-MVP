import { useTranslation } from 'react-i18next';
import { OPINION_DIFFERENCE_STEPS as STEPS, opinionDifferenceIndex } from '@/lib/opinion-difference';
import { cn } from '@/lib/utils';

/**
 * 5-step opinion-difference meter on the 0–10 scale (0, 2, 5, 8, 10),
 * labelled from strong agreement to strong disagreement.
 */

const TONE_ACTIVE: Record<string, string> = {
  agree: 'bg-accent text-accent-foreground border-accent',
  neutral: 'bg-muted-foreground/80 text-background border-muted-foreground',
  disagree: 'bg-destructive text-destructive-foreground border-destructive',
};

interface TTEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Show as unselected until the user picks a step. */
  unset?: boolean;
}

export function TTEmojiRating({ value, onChange, disabled, unset = false }: TTEmojiRatingProps) {
  const { t } = useTranslation();
  const activeIdx = unset ? -1 : opinionDifferenceIndex(value);

  return (
    <div className="grid w-full grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('tt.opinionDifferenceLabel')}>
      {STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        const label = t(step.key);
        return (
          <button
            key={step.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step.value)}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1.5 transition-all',
              isActive
                ? cn('scale-105 opacity-100 shadow-md', TONE_ACTIVE[step.tone])
                : 'border-border bg-muted text-foreground opacity-70 hover:opacity-100',
              disabled && 'cursor-not-allowed opacity-30',
            )}
            aria-label={label}
            aria-checked={isActive}
            role="radio"
          >
            <step.Icon className="h-4 w-4 shrink-0" />
            <span className="w-full text-center text-[9px] font-semibold leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
