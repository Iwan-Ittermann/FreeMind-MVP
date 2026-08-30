import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isBotUser } from '@/lib/constants';

interface Opinion {
  id: string;
  topic_id: string;
  text: string;
  user_id: string;
  visible: boolean;
  status: string | null;
  notice_text: string | null;
}

interface ChatSession {
  chatId: string | null;
  topicId: string | null;
  myOpinion: Opinion | null;
  theirOpinion: Opinion | null;
  theirUserId: string | null;
  myOpinionId: string | null;
  theirOpinionId: string | null;
  isLoading: boolean;
  error: string | null;
  saveRating: (empathy: number, disagreement: number, messageCount?: number) => Promise<void>;
  isSavingRating: boolean;
  existingRating: { empathy: number; disagreement: number } | null;
  /** All rating rounds the current user already submitted for this chat. */
  myRatingRounds: { empathy: number; messageCount: number }[];
  // Average bridging score from both participants
  averageBridgingScore: number | null;
  myBridgingScore: number | null;
  theirBridgingScore: number | null;
  isBotChat: boolean;
}


export function useChatSession(theirOpinionId: string | null, sourceOpinionId?: string | null): ChatSession {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);

  // Fetch ALL ratings for the chat (both participants)
  const { data: allRatings, isLoading: loadingRatings } = useQuery({
    queryKey: ['chatAllRatings', chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data, error } = await supabase
        .from('chat_ratings')
        .select('empathy, disagreement, rater_id, message_count')
        .eq('chat_id', chatId)
        .order('message_count', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!chatId,
  });


  // Real-time subscription for chat ratings updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-ratings-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'chat_ratings',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          // Invalidate the ratings query to refetch
          queryClient.invalidateQueries({ queryKey: ['chatAllRatings', chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Ratings can be given once per round, so a user may have several rows.
  const myRatingRows = (allRatings ?? []).filter((r) => r.rater_id === user?.id);
  const theirRatingRows = (allRatings ?? []).filter((r) => r.rater_id !== user?.id);
  const myRatingRounds = myRatingRows.map((r) => ({
    empathy: r.empathy,
    messageCount: (r as { message_count?: number }).message_count ?? 0,
  }));

  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  // Latest round is what the UI shows as "your rating".
  const existingRating = myRatingRows.length ? myRatingRows[myRatingRows.length - 1] : null;
  const partnerRating = theirRatingRows.length ? theirRatingRows[theirRatingRows.length - 1] : null;

  // Bridging scores use the AVERAGE of all rounds a participant rated.
  // Understanding is stored 0-100 and normalised to 0-10 for the points formula.
  const myAvgEmpathy = avg(myRatingRows.map((r) => r.empathy));
  const theirAvgEmpathy = avg(theirRatingRows.map((r) => r.empathy));
  const myBridgingScore =
    myAvgEmpathy !== null ? Math.round((myAvgEmpathy / 10) * (existingRating?.disagreement ?? 5)) : null;
  const theirBridgingScore =
    theirAvgEmpathy !== null ? Math.round((theirAvgEmpathy / 10) * (partnerRating?.disagreement ?? 5)) : null;

  
  // Average bridging score (only if both have rated)
  const averageBridgingScore = (myBridgingScore !== null && theirBridgingScore !== null) 
    ? Math.round((myBridgingScore + theirBridgingScore) / 2)
    : myBridgingScore ?? theirBridgingScore;

  // Fetch the other person's opinion using secure view (excludes ip_address)
  const { data: theirOpinion, isLoading: loadingTheir, error: theirError } = useQuery({
    queryKey: ['opinion', theirOpinionId],
    queryFn: async () => {
      if (!theirOpinionId) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('*')
        .eq('id', theirOpinionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!theirOpinionId,
  });

  // Fetch source opinion if provided (for read-only edge viewing)
  const { data: sourceOpinion, isLoading: loadingSource, error: sourceError } = useQuery({
    queryKey: ['opinion', sourceOpinionId],
    queryFn: async () => {
      if (!sourceOpinionId) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('*')
        .eq('id', sourceOpinionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sourceOpinionId,
  });

  // Fetch the current user's opinion for this topic using secure view (excludes ip_address)
  // Only fetch if we don't have a sourceOpinionId (normal chat mode)
  const { data: myOpinion, isLoading: loadingMy, error: myError } = useQuery({
    queryKey: ['myOpinion', theirOpinion?.topic_id, user?.id],
    queryFn: async () => {
      if (!theirOpinion?.topic_id || !user?.id) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('*')
        .eq('topic_id', theirOpinion.topic_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!theirOpinion?.topic_id && !!user?.id && !sourceOpinionId,
  });

  // Determine which opinion to use as "my" opinion
  // If sourceOpinionId is provided (read-only edge view), use sourceOpinion
  // Otherwise use the current user's opinion
  const effectiveMyOpinion = sourceOpinionId ? sourceOpinion : myOpinion;

  // Create or get existing chat when both opinions are loaded
  // Only do this for non-read-only mode (when sourceOpinionId is not provided)
  useEffect(() => {
    async function getOrCreateChat() {
      // Don't create chats in read-only edge viewing mode
      if (sourceOpinionId) return;
      if (!effectiveMyOpinion || !theirOpinion || chatId) return;

      const { data, error } = await supabase.rpc('get_or_create_chat', {
        topic_uuid: effectiveMyOpinion.topic_id,
        opinion_a_uuid: effectiveMyOpinion.id,
        opinion_b_uuid: theirOpinion.id,
      });

      if (error) {
        console.error('Error getting/creating chat:', error);
        return;
      }

      setChatId(data);
    }

    getOrCreateChat();
  }, [effectiveMyOpinion, theirOpinion, chatId, sourceOpinionId]);

  // Mutation for saving a rating round (one row per round)
  const ratingMutation = useMutation({
    mutationFn: async ({
      empathy,
      disagreement,
      messageCount,
    }: { empathy: number; disagreement: number; messageCount: number }) => {
      if (!chatId || !user?.id) throw new Error('No chat or user');

      const { data: existing } = await supabase
        .from('chat_ratings')
        .select('id')
        .eq('chat_id', chatId)
        .eq('rater_id', user.id)
        .eq('message_count', messageCount)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chat_ratings')
          .update({ empathy, disagreement, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_ratings')
          .insert({
            chat_id: chatId,
            rater_id: user.id,
            empathy,
            disagreement,
            message_count: messageCount,
          });
        if (error) throw error;
      }

      // Append-only history so points can be weighted by how long a value was held.
      if (theirOpinion?.topic_id && theirOpinion.id) {
        const { error: evError } = await supabase.from('rating_events').insert({
          topic_id: theirOpinion.topic_id,
          rater_id: user.id,
          kind: 'understanding',
          target_opinion_id: theirOpinion.id,
          chat_id: chatId,
          value: empathy,
        });
        if (evError) console.error('Failed to log rating event:', evError);
      }
    },
    onSuccess: () => {
      // Invalidate ratings so average updates
      queryClient.invalidateQueries({ queryKey: ['chatAllRatings', chatId] });
      // Invalidate topic data so the graph updates when user goes back
      if (theirOpinion?.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['topic', theirOpinion.topic_id] });
      }
    },
  });

  const saveRating = async (empathy: number, disagreement: number, messageCount = 0) => {
    await ratingMutation.mutateAsync({ empathy, disagreement, messageCount });

  };

  const isLoading = loadingTheir || loadingMy || loadingSource || loadingRatings;
  const error = theirError?.message || myError?.message || sourceError?.message || null;

  // Get the other user's ID from their opinion
  const theirUserId = theirOpinion?.user_id || null;

  return {
    chatId,
    topicId: theirOpinion?.topic_id || null,
    theirUserId,
    myOpinion: effectiveMyOpinion
      ? { 
          id: effectiveMyOpinion.id, 
          topic_id: effectiveMyOpinion.topic_id, 
          text: effectiveMyOpinion.text, 
          user_id: effectiveMyOpinion.user_id,
          visible: effectiveMyOpinion.visible ?? true,
          status: effectiveMyOpinion.status ?? null,
          notice_text: effectiveMyOpinion.notice_text ?? null,
        }
      : null,
    theirOpinion: theirOpinion
      ? { 
          id: theirOpinion.id, 
          topic_id: theirOpinion.topic_id, 
          text: theirOpinion.text, 
          user_id: theirOpinion.user_id,
          visible: theirOpinion.visible ?? true,
          status: theirOpinion.status ?? null,
          notice_text: theirOpinion.notice_text ?? null,
        }
      : null,
    myOpinionId: effectiveMyOpinion?.id || null,
    theirOpinionId: theirOpinion?.id || null,
    isLoading,
    error,
    saveRating,
    isSavingRating: ratingMutation.isPending,
    existingRating: existingRating ? { empathy: existingRating.empathy, disagreement: existingRating.disagreement } : null,
    myRatingRounds,

    averageBridgingScore,
    myBridgingScore,
    theirBridgingScore,
    isBotChat: isBotUser(theirOpinion?.user_id),
  };
}
