import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GraduationCap, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedTutorialStep } from '@/hooks/useOnboardingTutorial';
import { useTutorialSettings } from '@/hooks/useTutorialSettings';

interface ChatTutorialOverlayProps {
  stepData: UnifiedTutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export function ChatTutorialOverlay({ stepData, currentStep, totalSteps, onNext, onSkip }: ChatTutorialOverlayProps) {
  const { t, i18n } = useTranslation();
  const { getCustomTitle, getCustomText } = useTutorialSettings();
  const [ratingHighlightRect, setRatingHighlightRect] = useState<DOMRect | null>(null);

  const currentLanguage = i18n.language.startsWith('de') ? 'de' : 'en';
  const customTitle = getCustomTitle('onboarding', stepData.id, currentLanguage);
  const customText = getCustomText('onboarding', stepData.id, currentLanguage);
  const displayTitle = customTitle || t(stepData.titleKey);
  const displayText = customText || t(stepData.textKey);

  // Find and highlight the rating scales
  useEffect(() => {
    const findRating = () => {
      // Try mobile rating first, then desktop
      const el = document.querySelector('[data-chat-tutorial="rating-scales-mobile"]') 
        || document.querySelector('[data-chat-tutorial="rating-scales"]');
      if (el) {
        setRatingHighlightRect(el.getBoundingClientRect());
      }
    };
    findRating();
    const interval = setInterval(findRating, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={(e) => e.stopPropagation()} />

      {/* Pulsing highlight around rating scales */}
      {ratingHighlightRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute pointer-events-none"
          style={{
            top: ratingHighlightRect.top - 6,
            left: ratingHighlightRect.left - 6,
            width: ratingHighlightRect.width + 12,
            height: ratingHighlightRect.height + 12,
            borderRadius: 12,
            border: '3px solid hsl(var(--accent))',
            boxShadow: '0 0 20px hsl(var(--accent) / 0.6), 0 0 40px hsl(var(--accent) / 0.3), inset 0 0 20px hsl(var(--accent) / 0.1)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Tutorial card - positioned just above rating buttons on mobile, bottom-center on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-80 pointer-events-auto bg-card border-2 border-accent rounded-xl shadow-2xl p-4"
        style={{
          bottom: ratingHighlightRect
            ? `calc(100vh - ${ratingHighlightRect.top}px + 12px)`
            : 120,
        }}
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

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onNext}
            className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {t('tutorial.next', 'Next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
