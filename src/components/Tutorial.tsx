import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TutorialStep } from '@/hooks/useTutorial';

interface TutorialProps {
  isActive: boolean;
  currentStep: number;
  currentStepData: TutorialStep;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface HighlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Tutorial({
  isActive,
  currentStep,
  currentStepData,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TutorialProps) {
  const { t } = useTranslation();
  const [highlightPosition, setHighlightPosition] = useState<HighlightPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStepData.targetSelector) {
      setHighlightPosition(null);
      // Center the tooltip for final step
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
      });
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(currentStepData.targetSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setHighlightPosition({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position - prefer below element, but adjust if needed
        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const margin = 16;

        let tooltipTop = rect.bottom + margin;
        let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;

        // Adjust if tooltip goes off screen
        if (tooltipTop + tooltipHeight > window.innerHeight) {
          tooltipTop = rect.top - tooltipHeight - margin;
        }
        if (tooltipLeft < margin) {
          tooltipLeft = margin;
        }
        if (tooltipLeft + tooltipWidth > window.innerWidth - margin) {
          tooltipLeft = window.innerWidth - tooltipWidth - margin;
        }

        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStepData]);

  if (!isActive) return null;

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Highlight ring around target element */}
        {highlightPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none"
            style={{
              top: highlightPosition.top,
              left: highlightPosition.left,
              width: highlightPosition.width,
              height: highlightPosition.height,
            }}
          >
            <div className="absolute inset-0 rounded-lg border-2 border-accent animate-pulse" />
            <div className="absolute inset-0 rounded-lg ring-4 ring-accent/30" />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute pointer-events-auto bg-card border border-border rounded-xl shadow-2xl p-4 w-80 max-w-[calc(100vw-32px)]"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Header with icon and close button */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground text-base mb-2">
            {t(currentStepData.titleKey)}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            {t(currentStepData.textKey)}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('tutorial.skip', 'Skip')}
            </Button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('tutorial.previous', 'Back')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={onNext}
                className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLastStep ? t('tutorial.finish', 'Finish') : t('tutorial.next', 'Next')}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
