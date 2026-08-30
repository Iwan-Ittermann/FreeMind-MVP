import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const EVENT_SETTING_KEYS = [
  'test_topic_short_code',
  'real_topic_short_code',
  'sandbox_topic_short_code',
  'archive_topic_short_code',
  'opinions_open_at',
  'discussion_open_at',
  'discussion_end_at',
] as const;

export type EventPhase = 'prelaunch' | 'submission' | 'discussion';

export interface EventConfig {
  testShortCode: string;
  realShortCode: string | null;
  sandboxShortCode: string | null;
  archiveShortCode: string | null;
  opinionsOpenAt: Date | null;
  discussionOpenAt: Date | null;
  discussionEndAt: Date | null;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Reads the event configuration (topic codes + phase timestamps) from app_settings. */
export function useEventConfig() {
  return useQuery({
    queryKey: ['event-config'],
    staleTime: 60_000,
    queryFn: async (): Promise<EventConfig> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', EVENT_SETTING_KEYS as unknown as string[]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, (r.value ?? '').trim()]));
      return {
        testShortCode: map.get('test_topic_short_code') || '7mm9',
        realShortCode: map.get('real_topic_short_code') || null,
        opinionsOpenAt: parseDate(map.get('opinions_open_at')),
        discussionOpenAt: parseDate(map.get('discussion_open_at')),
        discussionEndAt: parseDate(map.get('discussion_end_at')),
      };
    },
  });
}

/**
 * Current phase of the real event question.
 * Falls back to `discussion` (everything open) when no real topic is configured
 * yet, so the app never locks itself out.
 */
export function useEventPhase(config?: EventConfig | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (!config || !config.realShortCode) {
    return { phase: 'discussion' as EventPhase, gated: false, now };
  }

  const opinionsAt = config.opinionsOpenAt?.getTime() ?? null;
  const discussionAt = config.discussionOpenAt?.getTime() ?? null;

  let phase: EventPhase = 'discussion';
  if (opinionsAt !== null && now < opinionsAt) phase = 'prelaunch';
  else if (discussionAt !== null && now < discussionAt) phase = 'submission';

  return { phase, gated: true, now };
}
