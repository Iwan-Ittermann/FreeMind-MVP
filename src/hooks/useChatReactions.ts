import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  reactionType: string;
  createdAt: Date;
}

export function useChatReactions(chatId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ['chat-reactions', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      // Get all message IDs for this chat first
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chatId);
      if (!messages?.length) return [];

      const messageIds = messages.map(m => m.id);
      const { data, error } = await supabase
        .from('chat_message_reactions')
        .select('*')
        .in('message_id', messageIds);
      if (error) throw error;

      return (data || []).map((r): ChatReaction => ({
        id: r.id,
        messageId: r.message_id,
        userId: r.user_id,
        reactionType: r.reaction_type,
        createdAt: new Date(r.created_at),
      }));
    },
    enabled: !!chatId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`reactions-${chatId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_message_reactions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-reactions', chatId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, queryClient]);

  const addReaction = useMutation({
    mutationFn: async ({ messageId, reactionType }: { messageId: string; reactionType: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('chat_message_reactions')
        .insert({ message_id: messageId, user_id: user.id, reaction_type: reactionType });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-reactions', chatId] });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async ({ messageId, reactionType }: { messageId: string; reactionType: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('chat_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-reactions', chatId] });
    },
  });

  const getReactionsForMessage = (messageId: string) =>
    reactions.filter(r => r.messageId === messageId);

  const hasReacted = (messageId: string, reactionType: string) =>
    reactions.some(r => r.messageId === messageId && r.userId === user?.id && r.reactionType === reactionType);

  return {
    reactions,
    getReactionsForMessage,
    hasReacted,
    addReaction: addReaction.mutate,
    removeReaction: removeReaction.mutate,
  };
}
