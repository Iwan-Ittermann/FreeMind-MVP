import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UnreadMessageCount {
  opinionId: string;
  count: number;
}

export function useUnreadMessages(topicId: string, myOpinionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Subscribe to real-time updates for new messages with unique channel
  useEffect(() => {
    if (!topicId || !user?.id) return;

    // Use unique channel name with timestamp to avoid subscription conflicts
    const channelName = `unread-messages-${topicId}-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          // Force immediate refetch instead of just invalidating
          queryClient.refetchQueries({ queryKey: ['unreadMessages', topicId, myOpinionId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          // Force immediate refetch when messages are marked as read
          queryClient.refetchQueries({ queryKey: ['unreadMessages', topicId, myOpinionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, user?.id, myOpinionId, queryClient]);

  return useQuery({
    queryKey: ['unreadMessages', topicId, myOpinionId],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!user?.id || !myOpinionId) {
        return new Map();
      }

      // Get all chats the user is part of for this topic
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id, opinion_a_id, opinion_b_id')
        .eq('topic_id', topicId);

      if (chatsError) throw chatsError;
      if (!chats || chats.length === 0) return new Map();

      // Filter to chats where the user's opinion is involved
      const myChats = chats.filter(
        chat => chat.opinion_a_id === myOpinionId || chat.opinion_b_id === myOpinionId
      );

      if (myChats.length === 0) return new Map();

      // For each chat, get unread messages (messages not from me, with read_at = null)
      const unreadCounts = new Map<string, number>();

      for (const chat of myChats) {
        const otherOpinionId = chat.opinion_a_id === myOpinionId 
          ? chat.opinion_b_id 
          : chat.opinion_a_id;

        const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        if (!error && count && count > 0) {
          unreadCounts.set(otherOpinionId, count);
        }
      }

      return unreadCounts;
    },
    enabled: !!user?.id && !!myOpinionId && !!topicId,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });
}
