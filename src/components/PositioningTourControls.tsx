import { motion } from 'framer-motion';
import { ArrowRight, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface PositioningTourControlsProps {
  onNext: () => void;
  onStop: () => void;
  canContinue: boolean;
}

export function PositioningTourControls({ onNext, onStop, canContinue }: PositioningTourControlsProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: a small toolbar that sits just above the opinion panel.
    // Opinion panel is fixed at bottom-20; place this above it.
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed left-4 right-4 z-[55] flex items-center justify-between gap-2"
        style={{ bottom: 'calc(5rem + 18rem)' }}
      >
        <Button
          onClick={onStop}
          size="sm"
          variant="outline"
          className="border-border/40 bg-background/90 backdrop-blur-sm"
          aria-label={t('positioningTour.stop')}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          onClick={onNext}
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90 backdrop-blur-sm"
        >
          {canContinue ? (
            <>
              {t('positioningTour.next')}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          ) : (
            <>
              {t('positioningTour.done')}
              <Check className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  // Desktop: two buttons flanking the opinion panel (bottom-4, max-w-sm = 384px).
  // Center is left-1/2; panel half-width = 192px. Place X to the left of the panel,
  // and Next to the right of the panel, both vertically aligned with panel center.
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="fixed bottom-4 left-1/2 z-[55] -translate-x-[calc(192px+56px)]"
      >
        <Button
          onClick={onStop}
          size="icon"
          variant="outline"
          className="rounded-full bg-background/90 backdrop-blur-sm border-border/40 h-11 w-11 shadow-lg"
          aria-label={t('positioningTour.stop')}
          title={t('positioningTour.stop')}
        >
          <X className="w-5 h-5" />
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="fixed bottom-4 left-1/2 z-[55] translate-x-[calc(192px+16px)]"
      >
        <Button
          onClick={onNext}
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 px-5 shadow-lg"
        >
          {canContinue ? (
            <>
              {t('positioningTour.next')}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          ) : (
            <>
              {t('positioningTour.done')}
              <Check className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </motion.div>
    </>
  );
}
