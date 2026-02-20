import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedTutorialStep } from '@/hooks/useOnboardingTutorial';
import { useTutorialSettings } from '@/hooks/useTutorialSettings';

interface TutorialProps {
  isActive: boolean;
  currentStep: number;
  currentStepData: UnifiedTutorialStep | null;
  totalSteps: number;
  onNext: (force?: boolean) => void;
  onPrev: () => void;
  onSkip: () => void;
  hasExistingOpinion?: boolean;
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
  hasExistingOpinion,
}: TutorialProps) {
  const { t, i18n } = useTranslation();
  const { getCustomTitle, getCustomText } = useTutorialSettings();
  const [highlightPosition, setHighlightPosition] = useState<HighlightPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [userNodePosition, setUserNodePosition] = useState<HighlightPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentLanguage = i18n.language.startsWith('de') ? 'de' : 'en';
  const customTitle = currentStepData ? getCustomTitle('onboarding', currentStepData.id, currentLanguage) : null;
  const customText = currentStepData ? getCustomText('onboarding', currentStepData.id, currentLanguage) : null;
  const displayTitle = customTitle || (currentStepData ? t(currentStepData.titleKey) : '');
  const displayText = customText || (currentStepData ? t(currentStepData.textKey) : '');

  // Track user node position for red highlight during yourTent and exploreOpinions steps
  useEffect(() => {
    if (!isActive || !currentStepData) {
      setUserNodePosition(null);
      return;
    }

    const shouldHighlightUserNode = currentStepData.id === 'yourTent' || currentStepData.id === 'exploreOpinions';
    if (!shouldHighlightUserNode) {
      setUserNodePosition(null);
      return;
    }

    const updateUserNodePos = () => {
      const el = document.querySelector('[data-user-node="true"]');
      if (el) {
        const rect = el.getBoundingClientRect();
        setUserNodePosition({
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        });
      }
    };

    updateUserNodePos();
    const interval = setInterval(updateUserNodePos, 500);
    window.addEventListener('resize', updateUserNodePos);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateUserNodePos);
    };
  }, [isActive, currentStepData]);

  useEffect(() => {
    if (!isActive || !currentStepData) {
      setHighlightPosition(null);
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
      });
      return;
    }

    // For exploreOpinions, force tooltip to top
    if (currentStepData.id === 'exploreOpinions') {
      setHighlightPosition(null);
      setTooltipPosition({
        top: 80,
        left: Math.max(16, window.innerWidth / 2 - 160),
      });
      return;
    }

    if (!currentStepData.targetSelector) {
      setHighlightPosition(null);
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

        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const margin = 16;

        let tooltipTop = rect.bottom + margin;
        let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;

        if (tooltipTop + tooltipHeight > window.innerHeight) {
          tooltipTop = rect.top - tooltipHeight - margin;
        }
        if (tooltipLeft < margin) tooltipLeft = margin;
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

  if (!isActive || !currentStepData) return null;

  // Don't render step 7 (chatStarted) here — it renders inside the chat UI
  if (currentStepData.id === 'chatStarted') return null;

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  // Override: if user already has opinion and we're on addOpinion step, show Next button
  const isEventDriven = currentStepData.waitForEvent && 
    !(hasExistingOpinion && currentStepData.id === 'addOpinion');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
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

        {/* Red pulsing circle around user's node */}
        {userNodePosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute pointer-events-none"
            style={{
              top: userNodePosition.top,
              left: userNodePosition.left,
              width: userNodePosition.width,
              height: userNodePosition.height,
            }}
          >
            <div className="absolute inset-0 rounded-full border-3 border-red-500 animate-pulse" 
              style={{ borderWidth: '3px' }} />
            <div className="absolute -inset-2 rounded-full border-2 border-red-500/40 animate-ping" 
              style={{ animationDuration: '1.5s' }} />
          </motion.div>
        )}

        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute pointer-events-auto bg-card border border-border rounded-xl shadow-2xl p-4 w-80 max-w-[calc(100vw-32px)]"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        >
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

          <h3 className="font-semibold text-foreground text-base mb-2">{displayTitle}</h3>
          <p className="text-sm text-muted-foreground mb-4">{displayText}</p>

          <div className="flex items-center justify-end gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="gap-1 border-border text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('tutorial.previous', 'Back')}
              </Button>
            )}
            {!isEventDriven && (
              <Button
                size="sm"
                onClick={() => onNext(hasExistingOpinion && currentStepData?.id === 'addOpinion' ? true : undefined)}
                className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLastStep ? t('tutorial.finish', 'Finish') : t('tutorial.next', 'Next')}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {isEventDriven && (
              <span className="text-xs text-accent italic">
                {t('tutorial.waitingForAction')}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
