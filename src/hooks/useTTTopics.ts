import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TTTopicLite {
  id: string;
  title: string;
}

/**
 * Fetch a small ordered list of public topics for the TT swipe feed.
 * Kept intentionally minimal — single fetch, cached.
 */
export function useTTTopics() {
  return useQuery({
    queryKey: ['tt-topics'],
    queryFn: async (): Promise<TTTopicLite[]> => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title')
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TTTopicLite[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns a [prev, current, next] window around currentTopicId.
 */
export function useTTSwipeWindow(currentTopicId: string) {
  const { data: topics = [], isLoading } = useTTTopics();

  if (topics.length === 0) {
    return { topics: [currentTopicId], current: currentTopicId, isLoading };
  }

  const idx = topics.findIndex((t) => t.id === currentTopicId);
  if (idx === -1) {
    // Current isn't in the list — render it standalone with first known after it
    return { topics: [currentTopicId, ...topics.slice(0, 1).map((t) => t.id)], current: currentTopicId, isLoading };
  }

  const prev = idx > 0 ? topics[idx - 1].id : null;
  const next = idx < topics.length - 1 ? topics[idx + 1].id : null;
  const window = [prev, topics[idx].id, next].filter(Boolean) as string[];
  return { topics: window, current: currentTopicId, isLoading };
}
