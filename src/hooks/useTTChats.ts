import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TTChatItem {
  id: string;
  /** The OTHER user's opinion id (for opening EmbeddedChatView). */
  theirOpinionId: string;
  opinionText: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface TTPendingRequestItem {
  id: string;
  theirOpinionId: string;
  opinionText: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
}

/**
 * TT-specific chat data hook. Returns the current user's chats and pending
 * requests for a topic, polled every 4s and refreshed on realtime events.
 */
export function useTTChats(topicId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: myOpinion } = useQuery({
    queryKey: ['myOpinionForTopic', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', topicId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId && !!user?.id,
  });

  const { data: chats = [] } = useQuery({
    queryKey: ['ttChats', topicId, myOpinion?.id],
    queryFn: async (): Promise<TTChatItem[]> => {
      if (!myOpinion?.id) return [];
      const { data: chatData, error } = await supabase
        .from('chats')
        .select('id, opinion_a_id, opinion_b_id, created_at')
        .eq('topic_id', topicId)
        .or(`opinion_a_id.eq.${myOpinion.id},opinion_b_id.eq.${myOpinion.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!chatData?.length) return [];

      const otherIds = chatData.map((c) =>
        c.opinion_a_id === myOpinion.id ? c.opinion_b_id : c.opinion_a_id,
      );
      const { data: opinionsData } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', otherIds);

      const chatIds = chatData.map((c) => c.id);
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('chat_id, content, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, { content: string; created_at: string }>();
      messagesData?.forEach((m) => {
        if (!lastMsgMap.has(m.chat_id)) {
          lastMsgMap.set(m.chat_id, { content: m.content, created_at: m.created_at });
        }
      });
      const textMap = new Map(opinionsData?.map((o) => [o.id, o.text]) || []);

      return chatData.map((c) => {
        const theirOpinionId = c.opinion_a_id === myOpinion.id ? c.opinion_b_id : c.opinion_a_id;
        const last = lastMsgMap.get(c.id);
        return {
          id: c.id,
          theirOpinionId,
          opinionText: textMap.get(theirOpinionId) || '…',
          lastMessage: last?.content,
          lastMessageAt: last?.created_at,
        };
      });
    },
    enabled: !!myOpinion?.id,
    refetchInterval: 4000,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['ttPendingRequests', topicId, myOpinion?.id],
    queryFn: async (): Promise<TTPendingRequestItem[]> => {
      if (!myOpinion?.id) return [];
      const { data: reqData, error } = await supabase
        .from('chat_requests')
        .select('id, requester_opinion_id, target_opinion_id, created_at')
        .eq('topic_id', topicId)
        .eq('status', 'pending')
        .or(`requester_opinion_id.eq.${myOpinion.id},target_opinion_id.eq.${myOpinion.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!reqData?.length) return [];

      const otherIds = reqData.map((r) =>
        r.requester_opinion_id === myOpinion.id ? r.target_opinion_id : r.requester_opinion_id,
      );
      const { data: opinionsData } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', otherIds);
      const textMap = new Map(opinionsData?.map((o) => [o.id, o.text]) || []);

      return reqData.map((r) => {
        const isOutgoing = r.requester_opinion_id === myOpinion.id;
        const theirOpinionId = isOutgoing ? r.target_opinion_id : r.requester_opinion_id;
        return {
          id: r.id,
          theirOpinionId,
          opinionText: textMap.get(theirOpinionId) || '…',
          direction: isOutgoing ? 'outgoing' : 'incoming',
          createdAt: r.created_at,
        };
      });
    },
    enabled: !!myOpinion?.id,
    refetchInterval: 4000,
  });

  // Realtime: refresh on chat / chat_request changes
  useEffect(() => {
    if (!myOpinion?.id || !topicId) return;
    const channel = supabase
      .channel(`tt-chats-${topicId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_requests', filter: `topic_id=eq.${topicId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ['ttPendingRequests', topicId, myOpinion.id] });
          queryClient.refetchQueries({ queryKey: ['ttChats', topicId, myOpinion.id] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `topic_id=eq.${topicId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ['ttChats', topicId, myOpinion.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, myOpinion?.id, queryClient]);

  return { chats, pendingRequests, myOpinionId: myOpinion?.id ?? null };
}
