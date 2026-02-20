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

  const currentLanguage = i18n.language.startsWith('de') ? 'de' : 'en';
  const customTitle = getCustomTitle('onboarding', stepData.id, currentLanguage);
  const customText = getCustomText('onboarding', stepData.id, currentLanguage);
  const displayTitle = customTitle || t(stepData.titleKey);
  const displayText = customText || t(stepData.textKey);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Highlight overlay pulsing around the "Rate!" button area */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Tutorial card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-80 pointer-events-auto bg-card border-2 border-accent rounded-xl shadow-2xl p-4"
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
