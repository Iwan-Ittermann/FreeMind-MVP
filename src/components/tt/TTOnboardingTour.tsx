import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TTOnboardingTourProps {
  open: boolean;
  step: number;
  onBack: () => void;
  onNext: () => void;
  onDone: () => void;
}

export function TTOnboardingTour({ open, step, onBack, onNext, onDone }: TTOnboardingTourProps) {
  const { t } = useTranslation();
  const isOpinionsStep = step === 1;
  const isAddOpinionStep = step === 2;
  const isChatStep = step === 3;
  const canGoBack = step > 0;
  const stepKey = isChatStep
    ? 'tt.onboarding.chatStep'
    : isAddOpinionStep
      ? 'tt.onboarding.addOpinionStep'
      : isOpinionsStep
        ? 'tt.onboarding.opinionsStep'
        : 'tt.onboarding.firstStep';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 z-50 flex items-center justify-center px-6 ${isOpinionsStep || isAddOpinionStep || isChatStep ? 'pointer-events-none' : 'bg-background/20 backdrop-blur-[1px] pointer-events-auto'}`}
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
            <p className="px-4 py-5 text-lg font-medium leading-snug text-foreground">
              {t(stepKey)}
            </p>
            <div className="flex items-center justify-center gap-2">
              {canGoBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="h-8 rounded-full border border-border/50 px-3 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t('tt.onboarding.back')}
                </button>
              )}
              <button
                type="button"
                onClick={onDone}
                className="h-8 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t('tt.onboarding.skip')}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                {t(isChatStep ? 'tt.onboarding.done' : 'tt.onboarding.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}