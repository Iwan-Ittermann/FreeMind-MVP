import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorialSettings } from './useTutorialSettings';

const TUTORIAL_STORAGE_KEY = 'freemind_tutorial_completed';

export interface TutorialStep {
  id: string;
  targetSelector: string | null; // null for final step (no element highlight)
  titleKey: string;
  textKey: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'opinionSidebar',
    targetSelector: '[data-tutorial="opinions-button"]',
    titleKey: 'tutorial.opinionSidebar.title',
    textKey: 'tutorial.opinionSidebar.text',
  },
  {
    id: 'settings',
    targetSelector: '[data-tutorial="settings-button"]',
    titleKey: 'tutorial.settings.title',
    textKey: 'tutorial.settings.text',
  },
  {
    id: 'addOpinion',
    targetSelector: '[data-tutorial="add-opinion-button"]',
    titleKey: 'tutorial.addOpinion.title',
    textKey: 'tutorial.addOpinion.text',
  },
  {
    id: 'chats',
    targetSelector: '[data-tutorial="chats-button"]',
    titleKey: 'tutorial.chats.title',
    textKey: 'tutorial.chats.text',
  },
  {
    id: 'end',
    targetSelector: null,
    titleKey: 'tutorial.end.title',
    textKey: 'tutorial.end.text',
  },
];

export function useTutorial() {
  const { i18n } = useTranslation();
  const { isStepMuted } = useTutorialSettings();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const currentLanguage = i18n.language.startsWith('de') ? 'de' : 'en';

  // Filter out muted steps
  const activeSteps = useMemo(() => {
    return TUTORIAL_STEPS.filter(step => !isStepMuted('onboarding', step.id, currentLanguage));
  }, [isStepMuted, currentLanguage]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, activeSteps.length, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  const hasCompletedTutorial = useCallback(() => {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  }, []);

  const resetTutorialStatus = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  }, []);

  return {
    isActive,
    currentStep,
    currentStepData: activeSteps[currentStep] || activeSteps[0],
    totalSteps: activeSteps.length,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    hasCompletedTutorial,
    resetTutorialStatus,
  };
}
