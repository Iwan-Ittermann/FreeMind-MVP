import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TTOnboardingTourProps {
  open: boolean;
  step: number;
  onNext: () => void;
  onDone: () => void;
}

export function TTOnboardingTour({ open, step, onNext, onDone }: TTOnboardingTourProps) {
  const { t } = useTranslation();
  const isOpinionsStep = step === 1;
  const isAddOpinionStep = step === 2;
  const canContinue = step < 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 z-50 flex items-center justify-center px-6 ${isOpinionsStep ? 'pointer-events-none' : isAddOpinionStep ? 'pointer-events-none' : 'bg-background/20 backdrop-blur-[1px] pointer-events-auto'}`}
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
              {t(isAddOpinionStep ? 'tt.onboarding.addOpinionStep' : isOpinionsStep ? 'tt.onboarding.opinionsStep' : 'tt.onboarding.firstStep')}
            </p>
            {canContinue && (
              <button
                type="button"
                onClick={onNext}
                className="mx-auto rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t('tt.onboarding.next')}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}