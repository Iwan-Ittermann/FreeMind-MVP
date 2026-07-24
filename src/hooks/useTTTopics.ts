import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HELSINKI_TOPIC_SHORT_CODE } from '@/lib/constants';

export interface TTTopicLite {
  id: string;
  title: string;
  short_code: string;
}

/**
 * Fetch the single Helsinki event topic. This build is locked to one topic;
 * the array shape is preserved only because a few call sites still iterate.
 */
export function useTTTopics() {
  return useQuery({
    queryKey: ['tt-topics', HELSINKI_TOPIC_SHORT_CODE],
    queryFn: async (): Promise<TTTopicLite[]> => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, short_code')
        .eq('short_code', HELSINKI_TOPIC_SHORT_CODE)
        .maybeSingle();
      if (error) throw error;
      return data ? [data as TTTopicLite] : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
