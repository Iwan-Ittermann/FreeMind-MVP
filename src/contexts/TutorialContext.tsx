import React, { createContext, useContext, ReactNode } from 'react';
import { useTutorial } from '@/hooks/useTutorial';

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  currentStepData: ReturnType<typeof useTutorial>['currentStepData'];
  totalSteps: number;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  hasCompletedTutorial: () => boolean;
  resetTutorialStatus: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const tutorial = useTutorial();

  return (
    <TutorialContext.Provider value={tutorial}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider');
  }
  return context;
}
