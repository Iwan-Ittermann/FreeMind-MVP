import { useNavigate, useSearchParams } from 'react-router-dom';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { toast } from 'sonner';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const theirOpinionIdParam = searchParams.get('their');
  const isReadOnly = searchParams.get('readonly') === 'true';
  
  const { 
    chatId,
    topicId,
    myOpinion, 
    theirOpinion,
    myOpinionId,
    theirOpinionId,
    isLoading, 
    error,
    saveRating,
    isSavingRating,
    existingRating,
  } = useChatSession(theirOpinionIdParam);

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
        myOpinion={myOpinion?.text || 'Unknown opinion'}
        theirOpinion={theirOpinion.text}
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
    <FloatingChat
      chatId={chatId}
      topicId={topicId || undefined}
      myOpinion={myOpinion.text}
      theirOpinion={theirOpinion.text}
      myOpinionId={myOpinionId || undefined}
      theirOpinionId={theirOpinionId || undefined}
      onClose={handleClose}
      onSubmitRating={handleSubmitRating}
      isSavingRating={isSavingRating}
      isReadOnly={false}
      initialEmpathy={existingRating?.empathy}
      initialDisagreement={existingRating?.disagreement}
    />
  );
}
