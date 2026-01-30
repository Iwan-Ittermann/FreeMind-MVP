import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatRequest {
  id: string;
  topic_id: string;
  requester_opinion_id: string;
  target_opinion_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export function useChatRequests(topicId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all chat requests for this topic
  const { data: chatRequests = [], isLoading, error } = useQuery({
    queryKey: ['chatRequests', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_requests')
        .select('*')
        .eq('topic_id', topicId);
      if (error) throw error;
      return data as ChatRequest[];
    },
    enabled: !!topicId,
  });

  // Subscribe to realtime updates with unique channel name
  useEffect(() => {
    if (!topicId) return;

    // Use unique channel name with timestamp to avoid conflicts
    const channelName = `chat-requests-${topicId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          // Force immediate refetch instead of just invalidating
          queryClient.refetchQueries({ queryKey: ['chatRequests', topicId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, queryClient]);

  // Send a chat request
  const sendRequestMutation = useMutation({
    mutationFn: async ({ requesterOpinionId, targetOpinionId }: { requesterOpinionId: string; targetOpinionId: string }) => {
      const { error } = await supabase
        .from('chat_requests')
        .insert({
          topic_id: topicId,
          requester_opinion_id: requesterOpinionId,
          target_opinion_id: targetOpinionId,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRequests', topicId] });
    },
  });

  // Accept a chat request
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('chat_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRequests', topicId] });
    },
  });

  // Decline a chat request
  const declineRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('chat_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRequests', topicId] });
    },
  });

  // Helper functions
  const getRequestBetween = (opinionA: string, opinionB: string): ChatRequest | undefined => {
    return chatRequests.find(r =>
      (r.requester_opinion_id === opinionA && r.target_opinion_id === opinionB) ||
      (r.requester_opinion_id === opinionB && r.target_opinion_id === opinionA)
    );
  };

  const getPendingRequestsForOpinion = (opinionId: string): ChatRequest[] => {
    return chatRequests.filter(r => r.target_opinion_id === opinionId && r.status === 'pending');
  };

  const getAcceptedRequests = (): ChatRequest[] => {
    return chatRequests.filter(r => r.status === 'accepted');
  };

  const hasAcceptedChat = (opinionA: string, opinionB: string): boolean => {
    return chatRequests.some(r =>
      r.status === 'accepted' &&
      ((r.requester_opinion_id === opinionA && r.target_opinion_id === opinionB) ||
       (r.requester_opinion_id === opinionB && r.target_opinion_id === opinionA))
    );
  };

  const hasPendingRequest = (fromOpinion: string, toOpinion: string): boolean => {
    return chatRequests.some(r =>
      r.status === 'pending' &&
      r.requester_opinion_id === fromOpinion &&
      r.target_opinion_id === toOpinion
    );
  };

  return {
    chatRequests,
    isLoading,
    error,
    sendRequest: sendRequestMutation.mutateAsync,
    acceptRequest: acceptRequestMutation.mutateAsync,
    declineRequest: declineRequestMutation.mutateAsync,
    isSending: sendRequestMutation.isPending,
    isAccepting: acceptRequestMutation.isPending,
    isDeclining: declineRequestMutation.isPending,
    getRequestBetween,
    getPendingRequestsForOpinion,
    getAcceptedRequests,
    hasAcceptedChat,
    hasPendingRequest,
  };
}
