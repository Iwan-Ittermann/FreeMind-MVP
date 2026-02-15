import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Tracks the current user's presence globally across all routes.
 * On /home, usePresence handles both tracking and reading.
 * On other routes (e.g. /chat), this hook ensures the user still appears online.
 */
export function useGlobalPresence() {
  const { user } = useAuth();
  const location = useLocation();
  const isOnHomePage = location.pathname === '/home';

  const { data: myOpinionId } = useQuery({
    queryKey: ['myOpinionIdForPresence', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', DEFAULT_TOPIC_ID)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Only track on non-home pages (home page uses usePresence which already tracks)
  useEffect(() => {
    if (!myOpinionId || isOnHomePage) return;

    const channel = supabase.channel(`presence-topic-${DEFAULT_TOPIC_ID}`);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ opinionId: myOpinionId });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myOpinionId, isOnHomePage]);
}
