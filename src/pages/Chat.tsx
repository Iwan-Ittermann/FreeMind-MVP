import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { ChatTutorial } from '@/components/chat/ChatTutorial';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatTutorialContext } from '@/contexts/ChatTutorialContext';
import { hasChatTutorialBeenSeen } from '@/hooks/useChatTutorial';
import { toast } from 'sonner';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const chatTutorial = useChatTutorialContext();
  
  const theirOpinionIdParam = searchParams.get('their');
  const sourceOpinionIdParam = searchParams.get('source'); // For read-only edge viewing
  const isReadOnly = searchParams.get('readonly') === 'true';
  
  const { 
    chatId,
    topicId,
    myOpinion, 
    theirOpinion,
    theirUserId,
    myOpinionId,
    theirOpinionId,
    isLoading, 
    error,
    saveRating,
    isSavingRating,
    existingRating,
    averageBridgingScore,
  } = useChatSession(theirOpinionIdParam, isReadOnly ? sourceOpinionIdParam : undefined);

  // Auto-start chat tutorial on first chat open (non-read-only)
  useEffect(() => {
    if (!isReadOnly && !isLoading && chatId && user && !chatTutorial.isActive) {
      // Check if this is the user's first time opening a chat
      if (!hasChatTutorialBeenSeen()) {
        // Small delay to ensure UI is rendered
        const timer = setTimeout(() => {
          chatTutorial.startTutorial();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isReadOnly, isLoading, chatId, user, chatTutorial]);

  const handleClose = () => {
    navigate('/');
  };

  const handleSubmitRating = async (empathy: number, disagreement: number) => {
    try {
      await saveRating(empathy, disagreement);
      toast.success('Rating saved!');
    } catch (err) {
      console.error('Error saving rating:', err);
      toast.error('Failed to save rating');
    }
  };

  // Read-only mode: don't require user login
  if (isReadOnly) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading chat...</p>
          </div>
        </div>
      );
    }

    if (!theirOpinion) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-white/60 mb-4 text-sm md:text-base">Chat not found.</p>
            <button 
              onClick={() => navigate('/')}
              className="text-primary hover:underline py-2 px-4 text-base"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <FloatingChat
        chatId={chatId}
        topicId={topicId || undefined}
        myOpinion={{
          text: myOpinion?.text || 'Unknown opinion',
          visible: myOpinion?.visible ?? true,
          notice_text: myOpinion?.notice_text ?? null,
        }}
        theirOpinion={{
          text: theirOpinion.text,
          visible: theirOpinion.visible,
          notice_text: theirOpinion.notice_text,
        }}
        myOpinionId={myOpinionId || undefined}
        theirOpinionId={theirOpinionId || undefined}
        onClose={handleClose}
        isReadOnly={true}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4 text-sm md:text-base">You need to be signed in to chat.</p>
          <button 
            onClick={() => navigate('/auth')}
            className="text-primary hover:underline py-2 px-4 text-base"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error || !myOpinion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-white/60 mb-4 text-sm md:text-base">
            {error || "You need to submit your own opinion first before chatting with others."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline py-2 px-4 text-base"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!theirOpinion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4 text-sm md:text-base">Opinion not found.</p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline py-2 px-4 text-base"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <FloatingChat
        chatId={chatId}
        topicId={topicId || undefined}
        myOpinion={{
          text: myOpinion.text,
          visible: myOpinion.visible,
          notice_text: myOpinion.notice_text,
        }}
        theirOpinion={{
          text: theirOpinion.text,
          visible: theirOpinion.visible,
          notice_text: theirOpinion.notice_text,
        }}
        myOpinionId={myOpinionId || undefined}
        theirOpinionId={theirOpinionId || undefined}
        theirUserId={theirUserId}
        onClose={handleClose}
        onSubmitRating={handleSubmitRating}
        isSavingRating={isSavingRating}
        isReadOnly={false}
        initialEmpathy={existingRating?.empathy}
        initialDisagreement={existingRating?.disagreement}
        averageBridgingScore={averageBridgingScore}
      />

      {/* Chat Tutorial Overlay */}
      <ChatTutorial
        isActive={chatTutorial.isActive}
        currentStep={chatTutorial.currentStep}
        currentStepData={chatTutorial.currentStepData}
        totalSteps={chatTutorial.totalSteps}
        onNext={chatTutorial.nextStep}
        onPrev={chatTutorial.prevStep}
        onEnd={chatTutorial.endTutorial}
      />
    </>
  );
}
