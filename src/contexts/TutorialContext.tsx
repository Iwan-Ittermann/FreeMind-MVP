import React, { createContext, useContext, ReactNode } from 'react';
import { useOnboardingTutorial } from '@/hooks/useOnboardingTutorial';

type TutorialContextType = ReturnType<typeof useOnboardingTutorial>;

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const tutorial = useOnboardingTutorial();

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
