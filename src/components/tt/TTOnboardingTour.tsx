import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TTOnboardingTourProps {
  open: boolean;
  step: number;
  onNext: () => void;
  onDone: () => void;
}

export const TT_TOUR_TOTAL_STEPS = 2;

export function TTOnboardingTour({ open, step, onNext, onDone }: TTOnboardingTourProps) {
  const { t } = useTranslation();
  const isLastStep = step >= TT_TOUR_TOTAL_STEPS;
  const stepKey = isLastStep ? 'tt.onboarding.chatStep' : 'tt.onboarding.rateStep';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-x-0 top-0 bottom-[140px] z-[70] flex items-center justify-center px-6 pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="pointer-events-auto relative w-full max-w-[320px] rounded-2xl border border-border/40 bg-background/95 p-5 text-center shadow-2xl backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={onDone}
              className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="whitespace-pre-line px-4 py-5 text-lg font-medium leading-snug text-foreground">
              {t(stepKey)}
            </p>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={onNext}
                className="h-9 min-w-28 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                {t(isLastStep ? 'tt.onboarding.done' : 'tt.onboarding.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
