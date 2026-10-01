import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEventConfig } from '@/hooks/useEventConfig';

export interface EventTopic {
  id: string;
  title: string;
  short_code: string;
}

export type EventTopicRole = 'test' | 'real' | 'sandbox' | 'archive' | 'sim';

/**
 * Resolves the topic for a route role.
 *  - `test`    → the playground question (always open)
 *  - `sandbox` → the open sandbox question (/go)
 *  - `archive` → the finished August event (/aug-test), read-only
 *  - `sim`     → the AI simulation question (/sim)
 *  - `real`    → the configured event question; falls back to the test topic
 *    while no real question is configured yet.
 */
export function useEventTopic(role: EventTopicRole) {
  const { data: config, isLoading: configLoading } = useEventConfig();
  const shortCode =
    role === 'test'
      ? config?.testShortCode ?? null
      : role === 'sandbox'
        ? config?.sandboxShortCode ?? null
        : role === 'archive'
          ? config?.archiveShortCode || config?.realShortCode || null
          : role === 'sim'
            ? config?.simShortCode ?? null
            : config?.realShortCode || config?.testShortCode || null;

  const query = useQuery({
    queryKey: ['event-topic', shortCode],
    enabled: !!shortCode,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EventTopic | null> => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, short_code')
        .eq('short_code', shortCode!)
        .maybeSingle();
      if (error) throw error;
      return (data as EventTopic) ?? null;
    },
  });

  return {
    topic: query.data ?? null,
    isLoading: configLoading || (!!shortCode && query.isPending),
    config: config ?? null,
  };
}
