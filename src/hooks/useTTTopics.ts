import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SINGLE_TOPIC_MODE, SINGLE_TOPIC_SHORT_CODE } from '@/lib/single-topic';

export interface TTTopicLite {
  id: string;
  title: string;
  short_code: string;
}

/**
 * Fetch all public topics for the TT swipe feed.
 * In SINGLE_TOPIC_MODE the list is filtered to the configured short_code only.
 */
export function useTTTopics() {
  return useQuery({
    queryKey: ['tt-topics', SINGLE_TOPIC_MODE ? SINGLE_TOPIC_SHORT_CODE : 'all'],
    queryFn: async (): Promise<TTTopicLite[]> => {
      let query = supabase
        .from('topics')
        .select('id, title, short_code')
        .eq('status', 'Active');

      if (SINGLE_TOPIC_MODE && SINGLE_TOPIC_SHORT_CODE) {
        query = query.eq('short_code', SINGLE_TOPIC_SHORT_CODE);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TTTopicLite[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns all topic ids for the TT feed. The page adds loop clones around them.
 */
export function useTTSwipeWindow(currentTopicId: string) {
  const { data: topics = [], isLoading } = useTTTopics();
  const ids = topics.map((t) => t.id);
  return { topics: ids.length ? ids : [currentTopicId], current: currentTopicId, isLoading };
}
