import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PositioningTourCongratsProps {
  open: boolean;
  onStart: () => void;
}

export function PositioningTourCongrats({ open, onStart }: PositioningTourCongratsProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background border border-border/40 rounded-xl p-6 mx-4 max-w-sm shadow-2xl text-center"
          >
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('positioningTour.congratsTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mb-5 whitespace-pre-line">
              {t('positioningTour.congratsBody')}
            </p>
            <Button
              onClick={onStart}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
            >
              {t('positioningTour.start')}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
