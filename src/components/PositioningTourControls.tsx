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

  // Desktop: rendered as siblings of the opinion panel inside the graph wrapper.
  // Panel uses `lg:left-1/2 -translate-x-1/2 lg:max-w-sm` (384px wide → 192px half).
  // Place buttons fully outside the panel: right edge of panel = +192px, leave 24px gap.
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="absolute bottom-4 left-1/2 z-[55]"
        style={{ transform: 'translateX(calc(-192px - 24px - 44px))' }}
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
        className="absolute bottom-4 left-1/2 z-[55]"
        style={{ transform: 'translateX(calc(192px + 24px))' }}
      >
        <Button
          onClick={onNext}
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 px-4 shadow-lg"
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
