import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { ChatTutorial } from '@/components/chat/ChatTutorial';
import { FloatingHelpButton } from '@/components/FloatingHelpButton';
import { VideoMiniPlayer } from '@/components/VideoMiniPlayer';
import { ChatTutorialOverlay } from '@/components/chat/ChatTutorialOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatTutorialContext } from '@/contexts/ChatTutorialContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { toast } from 'sonner';

const VIDEO_URL = 'https://jmkbkwhiucnksdygbomc.supabase.co/storage/v1/object/public/tutorials/freemind-video-tutorial.mp4';
const CHAT_VIDEO_START_TIME = 39; // Start at 00:39 for chat-specific tutorial

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const chatTutorial = useChatTutorialContext();
  const tutorial = useTutorialContext();
  const [videoOpen, setVideoOpen] = useState(false);
  
  const theirOpinionIdParam = searchParams.get('their');
  const sourceOpinionIdParam = searchParams.get('source');
  const isReadOnly = searchParams.get('readonly') === 'true';
  
  const { 
    chatId, topicId, myOpinion, theirOpinion, theirUserId,
    myOpinionId, theirOpinionId, isLoading, error,
    saveRating, isSavingRating, existingRating, averageBridgingScore,
    isBotChat,
  } = useChatSession(theirOpinionIdParam, isReadOnly ? sourceOpinionIdParam : undefined);

  const handleClose = () => { navigate('/'); };

  const handleSubmitRating = async (empathy: number, disagreement: number) => {
    try {
      await saveRating(empathy, disagreement);
    } catch (err) {
      console.error('Error saving rating:', err);
      toast.error(t('chat.failedToSaveRating'));
    }
  };

  // Check if onboarding tutorial is on chatStarted step
  const showOnboardingChatOverlay = tutorial.isActive && tutorial.currentStepData?.id === 'chatStarted';

  // Read-only mode
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
            <button onClick={() => navigate('/')} className="text-primary hover:underline py-2 px-4 text-base">Go Back</button>
          </div>
        </div>
      );
    }
    return (
      <FloatingChat
        chatId={chatId} topicId={topicId || undefined}
        myOpinion={{ text: myOpinion?.text || 'Unknown opinion', visible: myOpinion?.visible ?? true, notice_text: myOpinion?.notice_text ?? null }}
        theirOpinion={{ text: theirOpinion.text, visible: theirOpinion.visible, notice_text: theirOpinion.notice_text }}
        myOpinionId={myOpinionId || undefined} theirOpinionId={theirOpinionId || undefined}
        onClose={handleClose} isReadOnly={true}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4 text-sm md:text-base">You need to be signed in to chat.</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline py-2 px-4 text-base">Sign In</button>
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
          <button onClick={() => navigate('/')} className="text-primary hover:underline py-2 px-4 text-base">Go Back</button>
        </div>
      </div>
    );
  }

  if (!theirOpinion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4 text-sm md:text-base">Opinion not found.</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline py-2 px-4 text-base">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <FloatingChat
        chatId={chatId} topicId={topicId || undefined}
        myOpinion={{ text: myOpinion.text, visible: myOpinion.visible, notice_text: myOpinion.notice_text }}
        theirOpinion={{ text: theirOpinion.text, visible: theirOpinion.visible, notice_text: theirOpinion.notice_text }}
        myOpinionId={myOpinionId || undefined} theirOpinionId={theirOpinionId || undefined}
        theirUserId={theirUserId} onClose={handleClose} onSubmitRating={handleSubmitRating}
        isSavingRating={isSavingRating} isReadOnly={false}
        initialEmpathy={existingRating?.empathy} initialDisagreement={existingRating?.disagreement}
        averageBridgingScore={averageBridgingScore}
        isBotChat={isBotChat}
      />

      {/* Onboarding tutorial step 7 overlay for mobile */}
      {showOnboardingChatOverlay && (
        <ChatTutorialOverlay
          stepData={tutorial.currentStepData!}
          currentStep={tutorial.currentStep}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onSkip={tutorial.skipTutorial}
        />
      )}

      {/* Video Mini Player */}
      <VideoMiniPlayer
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoSrc={VIDEO_URL}
        startTime={CHAT_VIDEO_START_TIME}
      />
    </>
  );
}
