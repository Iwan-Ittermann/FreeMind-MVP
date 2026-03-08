import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BOT_USER_ID } from '@/lib/constants';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  isOwn: boolean;
  createdAt: Date;
}

interface UseChatMessagesResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  isSending: boolean;
  isBotTyping: boolean;
}

export function useChatMessages(chatId: string | null, isBotChat = false): UseChatMessagesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing messages
  // Include user?.id in query key to refetch when user changes (fixes isOwn calculation)
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', chatId, user?.id],
    queryFn: async () => {
      if (!chatId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data.map((msg): ChatMessage => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_id,
        isOwn: msg.sender_id === user.id,
        createdAt: new Date(msg.created_at),
      }));
    },
    enabled: !!chatId && !!user?.id,
  });

  // Mark other user's messages as read when chat is open
  useEffect(() => {
    if (!chatId || !user?.id) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return;
      }

      // Force immediate refetch for badge updates
      queryClient.refetchQueries({ queryKey: ['unreadMessages'] });
    };

    markAsRead();
  }, [chatId, user?.id, messages.length, queryClient]);

  // Subscribe to real-time updates with unique channel name
  useEffect(() => {
    if (!chatId) return;

    // Use unique channel name with timestamp to avoid subscription conflicts
    const channelName = `chat-messages-${chatId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const message: ChatMessage = {
            id: newMsg.id,
            content: newMsg.content,
            senderId: newMsg.sender_id,
            isOwn: newMsg.sender_id === user?.id,
            createdAt: new Date(newMsg.created_at),
          };
          
          // Add message to cache immediately if not already there
          queryClient.setQueryData(['chat-messages', chatId, user?.id], (old: ChatMessage[] = []) => {
            if (old.some(m => m.id === message.id)) return old;
            return [...old, message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id, queryClient]);

  const [isBotTyping, setIsBotTyping] = useState(false);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!chatId || !user?.id) throw new Error('Cannot send message');
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: async () => {
      // If this is a bot chat, trigger the AI response
      if (isBotChat && chatId) {
        setIsBotTyping(true);
        try {
          const { error } = await supabase.functions.invoke('ai-chat', {
            body: { chatId },
          });
          if (error) {
            console.error('AI chat error:', error);
          }
        } catch (err) {
          console.error('Failed to get AI response:', err);
        } finally {
          setIsBotTyping(false);
        }
      }
    },
  });

  const sendMessage = async (content: string) => {
    await sendMutation.mutateAsync(content);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    isSending: sendMutation.isPending,
    isBotTyping,
  };
}
