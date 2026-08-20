import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type NudgeStage = 'rate' | 'chat' | null;

/**
 * Where the user stands in the funnel: opinion → ratings → chat messages.
 * `rate` = has an opinion but rated nothing yet.
 * `chat` = rated at least once but never sent a message.
 */
export function useNudgeStage(topicId: string, ownOpinionId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nudge-stage', topicId, ownOpinionId, user?.id],
    enabled: !!topicId && !!ownOpinionId && !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<NudgeStage> => {
      const [{ count: ratingCount }, { count: messageCount }] = await Promise.all([
        supabase
          .from('opinion_ratings')
          .select('id', { count: 'exact', head: true })
          .eq('rater_opinion_id', ownOpinionId!),
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', user!.id),
      ]);

      if ((ratingCount ?? 0) === 0) return 'rate';
      if ((messageCount ?? 0) === 0) return 'chat';
      return null;
    },
  });
}
