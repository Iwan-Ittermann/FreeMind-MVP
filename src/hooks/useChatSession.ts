import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Opinion {
  id: string;
  text: string;
  user_id: string;
}

interface ChatSession {
  chatId: string | null;
  myOpinion: Opinion | null;
  theirOpinion: Opinion | null;
  isLoading: boolean;
  error: string | null;
  saveRating: (empathy: number, disagreement: number) => Promise<void>;
  isSavingRating: boolean;
}

export function useChatSession(theirOpinionId: string | null): ChatSession {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);

  // Fetch the other person's opinion
  const { data: theirOpinion, isLoading: loadingTheir, error: theirError } = useQuery({
    queryKey: ['opinion', theirOpinionId],
    queryFn: async () => {
      if (!theirOpinionId) return null;
      const { data, error } = await supabase
        .from('opinions')
        .select('*')
        .eq('id', theirOpinionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!theirOpinionId,
  });

  // Fetch the current user's opinion for this topic
  const { data: myOpinion, isLoading: loadingMy, error: myError } = useQuery({
    queryKey: ['myOpinion', theirOpinion?.topic_id, user?.id],
    queryFn: async () => {
      if (!theirOpinion?.topic_id || !user?.id) return null;
      const { data, error } = await supabase
        .from('opinions')
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

      // First check if a chat already exists between these two opinions
      const { data: existingChat, error: fetchError } = await supabase
        .from('chats')
        .select('id')
        .eq('topic_id', myOpinion.topic_id)
        .or(`and(opinion_a_id.eq.${myOpinion.id},opinion_b_id.eq.${theirOpinion.id}),and(opinion_a_id.eq.${theirOpinion.id},opinion_b_id.eq.${myOpinion.id})`)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing chat:', fetchError);
        return;
      }

      if (existingChat) {
        setChatId(existingChat.id);
        return;
      }

      // Create a new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          topic_id: myOpinion.topic_id,
          opinion_a_id: myOpinion.id,
          opinion_b_id: theirOpinion.id,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating chat:', createError);
        return;
      }

      setChatId(newChat.id);
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

  const isLoading = loadingTheir || loadingMy;
  const error = theirError?.message || myError?.message || null;

  return {
    chatId,
    myOpinion: myOpinion ? { id: myOpinion.id, text: myOpinion.text, user_id: myOpinion.user_id } : null,
    theirOpinion: theirOpinion ? { id: theirOpinion.id, text: theirOpinion.text, user_id: theirOpinion.user_id } : null,
    isLoading,
    error,
    saveRating,
    isSavingRating: ratingMutation.isPending,
  };
}
