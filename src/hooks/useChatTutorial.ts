import { useState, useCallback, useEffect } from 'react';

const CHAT_TUTORIAL_SEEN_KEY = 'freemind-chat-tutorial-seen';

export interface ChatTutorialStep {
  id: string;
  targetSelector: string | null;
  mobileTargetSelector?: string | null; // Alternative selector for mobile
  titleKey: string;
  textKey: string;
}

export const CHAT_TUTORIAL_STEPS: ChatTutorialStep[] = [
  {
    id: 'intro',
    targetSelector: null,
    mobileTargetSelector: null,
    titleKey: 'chatTutorial.intro.title',
    textKey: 'chatTutorial.intro.text',
  },
  {
    id: 'rating',
    targetSelector: '[data-chat-tutorial="rating-scales"]',
    mobileTargetSelector: '[data-chat-tutorial="rating-scales-mobile"]',
    titleKey: 'chatTutorial.rating.title',
    textKey: 'chatTutorial.rating.text',
  },
  {
    id: 'graph',
    targetSelector: '[data-chat-tutorial="mini-graph"]',
    mobileTargetSelector: null, // Skip on mobile - not visible
    titleKey: 'chatTutorial.graph.title',
    textKey: 'chatTutorial.graph.text',
  },
  {
    id: 'bridging',
    targetSelector: '[data-chat-tutorial="bridging-score"]',
    mobileTargetSelector: '[data-chat-tutorial="bridging-score"]', // Same on mobile
    titleKey: 'chatTutorial.bridging.title',
    textKey: 'chatTutorial.bridging.text',
  },
  {
    id: 'end',
    targetSelector: null,
    mobileTargetSelector: null,
    titleKey: 'chatTutorial.end.title',
    textKey: 'chatTutorial.end.text',
  },
];

// Check if user has already seen the chat tutorial
export function hasChatTutorialBeenSeen(): boolean {
  try {
    return localStorage.getItem(CHAT_TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

// Mark chat tutorial as seen
export function markChatTutorialAsSeen(): void {
  try {
    localStorage.setItem(CHAT_TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

export function useChatTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Track mobile state
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get filtered steps for mobile (skip steps with no mobile selector and content)
  const getActiveSteps = useCallback(() => {
    if (!isMobile) return CHAT_TUTORIAL_STEPS;
    
    // On mobile, skip the graph step since mini-graph is hidden
    return CHAT_TUTORIAL_STEPS.filter(step => {
      if (step.id === 'graph') return false; // Skip graph step on mobile
      return true;
    });
  }, [isMobile]);

  const activeSteps = getActiveSteps();

  // Get the correct selector based on device
  const getCurrentStepWithSelector = useCallback((step: ChatTutorialStep) => {
    if (isMobile && step.mobileTargetSelector !== undefined) {
      return { ...step, targetSelector: step.mobileTargetSelector };
    }
    return step;
  }, [isMobile]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markChatTutorialAsSeen();
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, activeSteps.length, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return {
    isActive,
    currentStep,
    currentStepData: getCurrentStepWithSelector(activeSteps[currentStep] || activeSteps[0]),
    totalSteps: activeSteps.length,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
  };
}
