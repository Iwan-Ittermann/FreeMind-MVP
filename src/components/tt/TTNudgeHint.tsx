import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { NudgeStage } from '@/hooks/useNudgeStage';

interface TTNudgeHintProps {
  stage: NudgeStage;
  onAction: () => void;
  /** Notifies the parent whether a hint currently occupies the hint zone. */
  onVisibilityChange?: (visible: boolean) => void;
}

const AUTO_DISMISS_MS = 20_000;
const STORE_KEY = 'tt:nudge-dismissed';

function readDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistDismissed(list: string[]) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

/** Slim, dismissible one-line hint that moves the user to the next step. */
export function TTNudgeHint({ stage, onAction, onVisibilityChange }: TTNudgeHintProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());

  const visible = !!stage && !dismissed.includes(stage);

  const dismiss = (s: NudgeStage) => {
    if (!s) return;
    setDismissed((prev) => {
      if (prev.includes(s)) return prev;
      const next = [...prev, s];
      persistDismissed(next);
      return next;
    });
  };

  // Auto-dismiss after a short while so the hint never lingers over the graph.
  useEffect(() => {
    if (!visible || !stage) return;
    const id = window.setTimeout(() => dismiss(stage), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [visible, stage]);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  const text = stage === 'rate' ? t('tt.nudgeRateText') : t('tt.nudgeChatText');
  const action = stage === 'rate' ? t('tt.nudgeRateAction') : t('tt.nudgeChatAction');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="pointer-events-none absolute left-3 right-3 bottom-[125px] z-30 flex justify-center"
        >
          <div className="pointer-events-auto flex w-full max-w-[340px] items-start gap-2 rounded-2xl border border-border/40 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md">
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground break-words">{text}</span>
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 whitespace-nowrap pt-px text-xs font-semibold text-primary hover:underline"
            >
              {action}
            </button>
            <button
              type="button"
              aria-label={t('common.close', 'Schließen')}
              onClick={() => dismiss(stage)}
              className="shrink-0 pt-0.5 text-muted-foreground/70 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
