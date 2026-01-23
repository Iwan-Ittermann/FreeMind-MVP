import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
}

export function useChatMessages(chatId: string | null): UseChatMessagesResult {
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

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
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
          
          // Add message to cache if not already there
          queryClient.setQueryData(['chat-messages', chatId], (old: ChatMessage[] = []) => {
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
  });

  const sendMessage = async (content: string) => {
    await sendMutation.mutateAsync(content);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    isSending: sendMutation.isPending,
  };
}
