import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook for standalone disagreement ratings on opinions.
 * Any user can rate their disagreement (0-100) with any other opinion,
 * regardless of whether they have a chat with them.
 *
 * Naming convention:
 * - "Disagreement rating" = opinion_ratings table (0-100 scale)
 * - "Respect rating" = chat_ratings table (empathy, -50 to +50 scale)
 */
export function useDisagreementRating(
  topicId: string | null,
  myOpinionId: string | null,
  targetOpinionId: string | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localDisagreement, setLocalDisagreement] = useState<number | null>(null);

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

  // Reset local state when target changes
  useEffect(() => {
    setLocalDisagreement(null);
  }, [targetOpinionId]);

  // Initialize local state from DB
  useEffect(() => {
    if (existingRating && localDisagreement === null) {
      setLocalDisagreement(existingRating.disagreement);
    }
  }, [existingRating, localDisagreement]);

  // The saved value from DB
  const savedDisagreement = existingRating?.disagreement ?? 50;

  // Upsert mutation — manual save only
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

  // Update local value only (no auto-save)
  const setDisagreement = useCallback((value: number) => {
    setLocalDisagreement(value);
  }, []);

  // Manual save
  const save = useCallback(() => {
    if (localDisagreement !== null) {
      mutation.mutate(localDisagreement);
    }
  }, [localDisagreement, mutation]);

  const currentValue = localDisagreement ?? savedDisagreement;
  const hasUnsavedChanges = currentValue !== savedDisagreement;

  return {
    disagreement: currentValue,
    setDisagreement,
    save,
    savedDisagreement,
    hasUnsavedChanges,
    isLoading,
    isSaving: mutation.isPending,
    canRate: !!user && !!myOpinionId && !!targetOpinionId && myOpinionId !== targetOpinionId,
  };
}

/** @deprecated Use useDisagreementRating instead */
export const useOpinionRating = useDisagreementRating;
