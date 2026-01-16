import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  myOpinionId: string | null;
  theirOpinionId: string | null;
  isLoading: boolean;
  error: string | null;
  saveRating: (empathy: number, disagreement: number) => Promise<void>;
  isSavingRating: boolean;
  existingRating: { empathy: number; disagreement: number } | null;
}

export function useChatSession(theirOpinionId: string | null): ChatSession {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);

  // Fetch existing rating for the current user
  const { data: existingRating, isLoading: loadingRating } = useQuery({
    queryKey: ['chatRating', chatId, user?.id],
    queryFn: async () => {
      if (!chatId || !user?.id) return null;
      const { data, error } = await supabase
        .from('chat_ratings')
        .select('empathy, disagreement')
        .eq('chat_id', chatId)
        .eq('rater_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!chatId && !!user?.id,
  });

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

  // Fetch the current user's opinion for this topic using secure view (excludes ip_address)
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
    enabled: !!theirOpinion?.topic_id && !!user?.id,
  });

  // Create or get existing chat when both opinions are loaded
  useEffect(() => {
    async function getOrCreateChat() {
      if (!myOpinion || !theirOpinion || chatId) return;

      const { data, error } = await supabase.rpc('get_or_create_chat', {
        topic_uuid: myOpinion.topic_id,
        opinion_a_uuid: myOpinion.id,
        opinion_b_uuid: theirOpinion.id,
      });

      if (error) {
        console.error('Error getting/creating chat:', error);
        return;
      }

      setChatId(data);
    }

    getOrCreateChat();
  }, [myOpinion, theirOpinion, chatId]);

  // Mutation for saving/updating rating
  const ratingMutation = useMutation({
    mutationFn: async ({ empathy, disagreement }: { empathy: number; disagreement: number }) => {
      if (!chatId || !user?.id) throw new Error('No chat or user');

      // Check if rating already exists
      const { data: existingRating } = await supabase
        .from('chat_ratings')
        .select('id')
        .eq('chat_id', chatId)
        .eq('rater_id', user.id)
        .maybeSingle();

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('chat_ratings')
          .update({ empathy, disagreement, updated_at: new Date().toISOString() })
          .eq('id', existingRating.id);
        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('chat_ratings')
          .insert({
            chat_id: chatId,
            rater_id: user.id,
            empathy,
            disagreement,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate topic data so the graph updates when user goes back
      if (theirOpinion?.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['topic', theirOpinion.topic_id] });
      }
    },
  });

  const saveRating = async (empathy: number, disagreement: number) => {
    await ratingMutation.mutateAsync({ empathy, disagreement });
  };

  const isLoading = loadingTheir || loadingMy || loadingRating;
  const error = theirError?.message || myError?.message || null;

  return {
    chatId,
    topicId: theirOpinion?.topic_id || null,
    myOpinion: myOpinion
      ? { 
          id: myOpinion.id, 
          topic_id: myOpinion.topic_id, 
          text: myOpinion.text, 
          user_id: myOpinion.user_id,
          visible: myOpinion.visible ?? true,
          status: myOpinion.status ?? null,
          notice_text: myOpinion.notice_text ?? null,
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
    myOpinionId: myOpinion?.id || null,
    theirOpinionId: theirOpinion?.id || null,
    isLoading,
    error,
    saveRating,
    isSavingRating: ratingMutation.isPending,
    existingRating: existingRating ? { empathy: existingRating.empathy, disagreement: existingRating.disagreement } : null,
  };
}
