import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lets the playground bots (A / B / C) react to the visitor's opinion.
 * Runs once on page load and again right after an opinion appears.
 *
 * `target` selects the topic the edge function works on:
 *  - `sandbox` → the open sandbox question (/go)
 *  - `archive` → the reopened August question (/aug-test)
 */
export function useSandboxBots(
  enabled: boolean,
  topicId: string,
  hasOwnOpinion: boolean,
  target: 'sandbox' | 'archive' = 'sandbox',
) {
  const queryClient = useQueryClient();
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !topicId) return;
    const key = `${target}:${topicId}:${hasOwnOpinion}`;
    if (doneRef.current === key) return;
    doneRef.current = key;

    let cancelled = false;
    supabase.functions
      .invoke('sandbox-bots', { body: { target } })
      .then(() => {
        if (cancelled) return;
        queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
        queryClient.invalidateQueries({ queryKey: ['tt-chats', topicId] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, topicId, hasOwnOpinion, target, queryClient]);
}
