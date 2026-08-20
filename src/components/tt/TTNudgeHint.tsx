import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { NudgeStage } from '@/hooks/useNudgeStage';

interface TTNudgeHintProps {
  stage: NudgeStage;
  onAction: () => void;
}

/** Slim, dismissible one-line hint that moves the user to the next step. */
export function TTNudgeHint({ stage, onAction }: TTNudgeHintProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<NudgeStage[]>([]);

  const visible = !!stage && !dismissed.includes(stage);
  const text = stage === 'rate' ? t('tt.nudgeRateText') : t('tt.nudgeChatText');
  const action = stage === 'rate' ? t('tt.nudgeRateAction') : t('tt.nudgeChatAction');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute left-1/2 bottom-[125px] z-30 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[360px] flex justify-center"
        >
          <div className="pointer-events-auto flex items-center gap-2 w-full rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg px-3 py-2">
            <span className="flex-1 text-[13px] leading-snug text-foreground">{text}</span>
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              {action}
            </button>
            <button
              type="button"
              aria-label={t('common.close', 'Schließen')}
              onClick={() => setDismissed((prev) => [...prev, stage])}
              className="shrink-0 text-muted-foreground/70 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
