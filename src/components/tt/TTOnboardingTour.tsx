import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TTOnboardingTourProps {
  open: boolean;
  onDone: () => void;
}

export function TTOnboardingTour({ open, onDone }: TTOnboardingTourProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-[1px] px-6 pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-[320px] rounded-2xl border border-border/40 bg-background/95 p-5 text-center shadow-2xl backdrop-blur-xl"
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
              {t('tt.onboarding.firstStep')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}