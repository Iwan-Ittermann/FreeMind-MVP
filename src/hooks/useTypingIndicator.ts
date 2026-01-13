import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingState {
  isTyping: boolean;
  userName?: string;
}

export function useTypingIndicator(chatId: string | null) {
  const { user } = useAuth();
  const [partnerTyping, setPartnerTyping] = useState<TypingState>({ isTyping: false });

  // Broadcast typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!chatId || !user?.id) return;

    const channel = supabase.channel(`typing-${chatId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping },
    });
  }, [chatId, user?.id]);

  // Subscribe to typing events
  useEffect(() => {
    if (!chatId || !user?.id) return;

    const channel = supabase
      .channel(`typing-${chatId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        if (userId !== user.id) {
          setPartnerTyping({ isTyping, userName: 'Partner' });
          
          // Auto-clear typing indicator after 3 seconds
          if (isTyping) {
            setTimeout(() => {
              setPartnerTyping({ isTyping: false });
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  return {
    partnerTyping,
    setTyping,
  };
}
