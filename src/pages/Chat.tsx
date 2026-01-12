import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const myOpinionId = searchParams.get('my');
  const theirOpinionId = searchParams.get('their');

  // Mock data for now - in production would fetch from DB
  const myOpinion = "We need immediate, aggressive action on climate change including carbon taxes and renewable energy mandates.";
  const theirOpinion = "Market-based solutions and innovation will solve climate change better than government intervention.";

  const handleClose = () => {
    navigate('/');
  };

  const handleSubmitRating = async (empathy: number, disagreement: number) => {
    if (!user || !myOpinionId || !theirOpinionId) return;

    // In production, this would save to the database
    console.log('Rating submitted:', { empathy, disagreement, myOpinionId, theirOpinionId });
  };

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

  return (
    <FloatingChat
      myOpinion={myOpinion}
      theirOpinion={theirOpinion}
      onClose={handleClose}
      onSubmitRating={handleSubmitRating}
    />
  );
}
