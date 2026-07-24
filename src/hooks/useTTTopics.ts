import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HELSINKI_TOPIC_SHORT_CODE } from '@/lib/constants';

export interface TTTopicLite {
  id: string;
  title: string;
  short_code: string;
}

/**
 * Fetch the single Helsinki event topic for the TT feed.
 */
export function useTTTopics() {
  return useQuery({
    queryKey: ['tt-topics', HELSINKI_TOPIC_SHORT_CODE],
    queryFn: async (): Promise<TTTopicLite[]> => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, short_code')
        .eq('status', 'Active')
        .eq('short_code', HELSINKI_TOPIC_SHORT_CODE)
        .order('created_at', { ascending: false });
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
