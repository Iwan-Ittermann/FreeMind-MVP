import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lazily generates the AI chat titles for chats that don't have one yet.
 * Each chat is attempted once per session.
 */
export function useEnsureChatTitles(
  chats: { id: string; title?: string | null }[],
  invalidateKey: unknown[],
) {
  const attempted = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    const missing = chats
      .filter((c) => !c.id.startsWith('pending:') && !c.title && !attempted.current.has(c.id))
      .slice(0, 3);
    if (missing.length === 0) return;

    missing.forEach((c) => attempted.current.add(c.id));
    (async () => {
      let changed = false;
      for (const c of missing) {
        const { error } = await supabase.functions.invoke('generate-chat-title', {
          body: { chatId: c.id },
        });
        if (!error) changed = true;
      }
      if (changed) queryClient.invalidateQueries({ queryKey: invalidateKey });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.map((c) => `${c.id}:${c.title ?? ''}`).join(',')]);
}
