import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook for standalone disagreement ratings on opinions.
 * Any user can rate their disagreement (0-100) with any other opinion,
 * regardless of whether they have a chat with them.
 */
export function useOpinionRating(
  topicId: string | null,
  myOpinionId: string | null,
  targetOpinionId: string | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localDisagreement, setLocalDisagreement] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryKey = ['opinionRating', myOpinionId, targetOpinionId];

  // Fetch existing rating
  const { data: existingRating, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!myOpinionId || !targetOpinionId) return null;
      const { data, error } = await supabase
        .from('opinion_ratings')
        .select('id, disagreement')
        .eq('rater_opinion_id', myOpinionId)
        .eq('target_opinion_id', targetOpinionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!myOpinionId && !!targetOpinionId,
  });

  // Initialize local state from DB
  useEffect(() => {
    if (existingRating && localDisagreement === null) {
      setLocalDisagreement(existingRating.disagreement);
    }
  }, [existingRating, localDisagreement]);

  // Upsert mutation
  const mutation = useMutation({
    mutationFn: async (disagreement: number) => {
      if (!myOpinionId || !targetOpinionId || !topicId) throw new Error('Missing IDs');

      if (existingRating?.id) {
        const { error } = await supabase
          .from('opinion_ratings')
          .update({ disagreement, updated_at: new Date().toISOString() })
          .eq('id', existingRating.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('opinion_ratings')
          .insert({
            topic_id: topicId,
            rater_opinion_id: myOpinionId,
            target_opinion_id: targetOpinionId,
            disagreement,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (topicId) {
        queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
      }
    },
  });

  // Debounced save (500ms)
  const setDisagreement = useCallback((value: number) => {
    setLocalDisagreement(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mutation.mutate(value);
    }, 500);
  }, [mutation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    disagreement: localDisagreement ?? existingRating?.disagreement ?? 50,
    setDisagreement,
    isLoading,
    isSaving: mutation.isPending,
    canRate: !!user && !!myOpinionId && !!targetOpinionId && myOpinionId !== targetOpinionId,
  };
}
