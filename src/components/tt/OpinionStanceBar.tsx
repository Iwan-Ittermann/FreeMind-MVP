import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { OPINION_DIFFERENCE_STEPS as STEPS, opinionDifferenceIndex } from '@/lib/opinion-difference';
import { useDisagreementRating } from '@/hooks/useOpinionRating';
import { cn } from '@/lib/utils';

const TONE_ACTIVE: Record<string, string> = {
  agree: 'bg-accent text-accent-foreground border-accent',
  neutral: 'bg-muted-foreground/80 text-background border-muted-foreground',
  disagree: 'bg-destructive text-destructive-foreground border-destructive',
};

interface OpinionStanceBarProps {
  topicId: string | null;
  myOpinionId: string | null;
  targetOpinionId: string;
  /** "row": like-bar under a list item. "chat": question first, collapses once answered. */
  variant?: 'row' | 'chat';
  readOnly?: boolean;
}

/** Five-step agree/disagree bar that saves on tap (opinion_ratings, shared animation path). */
export function OpinionStanceBar({ topicId, myOpinionId, targetOpinionId, variant = 'row', readOnly }: OpinionStanceBarProps) {
  const { t } = useTranslation();
  const { disagreement, saveNow, hasSavedRating, canRate, isLoading } = useDisagreementRating(topicId, myOpinionId, targetOpinionId);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const activeIdx = hasSavedRating ? opinionDifferenceIndex(disagreement) : -1;
  const disabled = readOnly || !canRate;

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(id);
  }, [flash]);

  const pick = async (value: number, key: string) => {
    if (!myOpinionId) {
      toast(t('tt.postFirstToRate'));
      return;
    }
    if (disabled) return;
    setFlash(t(key));
    try {
      await saveNow(value);
      setEditing(false);
    } catch {
      toast.error(t('tt.ratingFailed'));
    }
  };

  if (variant === 'chat') {
    if (!myOpinionId || isLoading) return null;
    if (hasSavedRating && !editing) {
      const step = STEPS[activeIdx];
      return (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setEditing(true)}
          className="flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <step.Icon className="h-3 w-3" />
          <span>{t('tt.yourStance', { stance: t(step.key) })}</span>
          {!readOnly && <Pencil className="h-2.5 w-2.5" />}
        </button>
      );
    }
    if (readOnly) return null;
  }

  return (
    <div className={cn(variant === 'chat' && 'rounded-lg border border-primary/40 bg-primary/5 px-2 py-2')}>
      {variant === 'chat' && (
        <p className="mb-1.5 text-center text-xs font-medium text-foreground">{t('tt.stanceQuestion')}</p>
      )}
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t('tt.stanceQuestion')}>
        {STEPS.map((step, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={step.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={t(step.key)}
              title={t(step.key)}
              disabled={readOnly}
              onClick={() => pick(step.value, step.key)}
              className={cn(
                'flex h-7 flex-1 items-center justify-center rounded-full border transition-all',
                isActive ? cn('shadow-sm', TONE_ACTIVE[step.tone]) : 'border-border/60 text-muted-foreground hover:text-foreground',
                disabled && !isActive && 'opacity-40',
              )}
            >
              <step.Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
      <p className="mt-1 h-3 text-center text-[10px] leading-3 text-muted-foreground">
        {flash ?? (variant === 'chat' ? `${t(STEPS[0].key)} ← → ${t(STEPS[4].key)}` : '')}
      </p>
    </div>
  );
}
