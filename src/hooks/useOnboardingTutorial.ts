import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorialSettings } from './useTutorialSettings';

const STORAGE_KEY = 'freemind_onboarding_state';
const COMPLETED_KEY = 'freemind_tutorial_completed';

export interface UnifiedTutorialStep {
  id: string;
  targetSelector: string | null;
  titleKey: string;
  textKey: string;
  waitForEvent: boolean;
}

export const UNIFIED_STEPS: UnifiedTutorialStep[] = [
  { id: 'welcome', targetSelector: null, titleKey: 'unifiedTutorial.welcome.title', textKey: 'unifiedTutorial.welcome.text', waitForEvent: false },
  { id: 'addOpinion', targetSelector: '[data-tutorial="add-opinion-button"]', titleKey: 'unifiedTutorial.addOpinion.title', textKey: 'unifiedTutorial.addOpinion.text', waitForEvent: true },
  { id: 'yourTent', targetSelector: '[data-user-node="true"]', titleKey: 'unifiedTutorial.yourTent.title', textKey: 'unifiedTutorial.yourTent.text', waitForEvent: false },
  
  { id: 'requestChat', targetSelector: null, titleKey: 'unifiedTutorial.requestChat.title', textKey: 'unifiedTutorial.requestChat.text', waitForEvent: true },
  { id: 'nowWeWait', targetSelector: null, titleKey: 'unifiedTutorial.nowWeWait.title', textKey: 'unifiedTutorial.nowWeWait.text', waitForEvent: false },
  { id: 'chatStarted', targetSelector: null, titleKey: 'unifiedTutorial.chatStarted.title', textKey: 'unifiedTutorial.chatStarted.text', waitForEvent: false },
  { id: 'done', targetSelector: null, titleKey: 'unifiedTutorial.done.title', textKey: 'unifiedTutorial.done.text', waitForEvent: false },
];

interface TutorialState {
  step: number;
}

function loadState(): TutorialState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: TutorialState | null) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useOnboardingTutorial() {
  const { i18n } = useTranslation();
  const { isStepMuted } = useTutorialSettings();
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<TutorialState>(() => loadState() || { step: 0 });

  const currentLanguage = i18n.language.startsWith('de') ? 'de' : 'en';

  const activeSteps = useMemo(() => {
    return UNIFIED_STEPS.filter(step => !isStepMuted('onboarding', step.id, currentLanguage));
  }, [isStepMuted, currentLanguage]);

  const updateState = useCallback((newState: TutorialState) => {
    setState(newState);
    saveState(newState);
  }, []);

  const startTutorial = useCallback(() => {
    const newState = { step: 0 };
    updateState(newState);
    setIsActive(true);
  }, [updateState]);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    saveState(null);
    localStorage.setItem(COMPLETED_KEY, 'true');
  }, []);

  const nextStep = useCallback((force?: boolean) => {
    const currentStepData = activeSteps[state.step];
    // Don't allow manual next on event-driven steps unless forced
    if (currentStepData?.waitForEvent && !force) return;
    
    if (state.step < activeSteps.length - 1) {
      updateState({ ...state, step: state.step + 1 });
    } else {
      endTutorial();
    }
  }, [state, activeSteps, endTutorial, updateState]);

  const prevStep = useCallback(() => {
    if (state.step > 0) {
      updateState({ ...state, step: state.step - 1 });
    }
  }, [state, updateState]);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  const hasCompletedTutorial = useCallback(() => {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  }, []);

  const resetTutorialStatus = useCallback(() => {
    localStorage.removeItem(COMPLETED_KEY);
    saveState(null);
  }, []);

  // Event: user submitted an opinion (advances from addOpinion step)
  const onOpinionSubmitted = useCallback(() => {
    if (!isActive) return;
    const currentStepData = activeSteps[state.step];
    if (currentStepData?.id === 'addOpinion') {
      updateState({ ...state, step: state.step + 1 });
    }
  }, [isActive, activeSteps, state, updateState]);


  // Event: user requested a chat
  const onChatRequested = useCallback(() => {
    if (!isActive) return;
    const currentStepData = activeSteps[state.step];
    if (currentStepData?.id === 'requestChat') {
      updateState({ ...state, step: state.step + 1 });
    }
  }, [isActive, activeSteps, state, updateState]);

  // Event: a chat was accepted
  const onChatAccepted = useCallback(() => {
    if (!isActive) return;
    const currentStepData = activeSteps[state.step];
    if (currentStepData?.id === 'nowWeWait') {
      updateState({ ...state, step: state.step + 1 });
    }
  }, [isActive, activeSteps, state, updateState]);

  // Event: user opened a chat
  const onChatOpened = useCallback(() => {
    if (!isActive) return;
    const currentStepData = activeSteps[state.step];
    if (currentStepData?.id === 'chatStarted') {
      updateState({ ...state, step: state.step + 1 });
    }
  }, [isActive, activeSteps, state, updateState]);

  const safeCurrentStepData = activeSteps[state.step] || activeSteps[0] || null;

  return {
    isActive: isActive && safeCurrentStepData !== null,
    currentStep: state.step,
    currentStepData: safeCurrentStepData,
    totalSteps: activeSteps.length,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    hasCompletedTutorial,
    resetTutorialStatus,
    onOpinionSubmitted,
    onChatRequested,
    onChatAccepted,
    onChatOpened,
  };
}
