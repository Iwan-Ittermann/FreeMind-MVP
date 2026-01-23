import { useState, useCallback } from 'react';

export interface ChatTutorialStep {
  id: string;
  targetSelector: string | null;
  titleKey: string;
  textKey: string;
}

export const CHAT_TUTORIAL_STEPS: ChatTutorialStep[] = [
  {
    id: 'intro',
    targetSelector: null, // No highlight for intro
    titleKey: 'chatTutorial.intro.title',
    textKey: 'chatTutorial.intro.text',
  },
  {
    id: 'rating',
    targetSelector: '[data-chat-tutorial="rating-scales"]',
    titleKey: 'chatTutorial.rating.title',
    textKey: 'chatTutorial.rating.text',
  },
  {
    id: 'graph',
    targetSelector: '[data-chat-tutorial="mini-graph"]',
    titleKey: 'chatTutorial.graph.title',
    textKey: 'chatTutorial.graph.text',
  },
  {
    id: 'bridging',
    targetSelector: '[data-chat-tutorial="bridging-score"]',
    titleKey: 'chatTutorial.bridging.title',
    textKey: 'chatTutorial.bridging.text',
  },
  {
    id: 'end',
    targetSelector: null, // No highlight for completion
    titleKey: 'chatTutorial.end.title',
    textKey: 'chatTutorial.end.text',
  },
];

export function useChatTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < CHAT_TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return {
    isActive,
    currentStep,
    currentStepData: CHAT_TUTORIAL_STEPS[currentStep],
    totalSteps: CHAT_TUTORIAL_STEPS.length,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
  };
}
