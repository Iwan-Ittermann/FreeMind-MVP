import { createContext, useContext, ReactNode } from 'react';
import { useChatTutorial, ChatTutorialStep } from '@/hooks/useChatTutorial';

interface ChatTutorialContextType {
  isActive: boolean;
  currentStep: number;
  currentStepData: ChatTutorialStep | null;
  totalSteps: number;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const ChatTutorialContext = createContext<ChatTutorialContextType | null>(null);

export function ChatTutorialProvider({ children }: { children: ReactNode }) {
  const tutorialState = useChatTutorial();

  return (
    <ChatTutorialContext.Provider value={tutorialState}>
      {children}
    </ChatTutorialContext.Provider>
  );
}

export function useChatTutorialContext() {
  const context = useContext(ChatTutorialContext);
  if (!context) {
    throw new Error('useChatTutorialContext must be used within a ChatTutorialProvider');
  }
  return context;
}
