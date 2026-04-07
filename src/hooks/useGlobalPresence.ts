import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

/**
 * Tracks the current user's presence globally across all routes.
 * On /topic/:topicId, usePresence handles both tracking and reading.
 * On other routes (e.g. /chat), this hook ensures the user still appears online
 * for whichever topic they were last viewing.
 */
export function useGlobalPresence() {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams<{ topicId?: string }>();

  // Detect if we're on a topic page (where usePresence already tracks)
  const isOnTopicPage = location.pathname.startsWith('/topic/');
  const topicId = params.topicId;

  // Find any opinion the user has (for presence tracking on non-topic pages)
  const { data: presenceInfo } = useQuery({
    queryKey: ['globalPresenceInfo', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('opinions_public')
        .select('id, topic_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data ? { opinionId: data.id, topicId: data.topic_id } : null;
    },
    enabled: !!user?.id && !isOnTopicPage,
    staleTime: 60000,
  });

  // Only track on non-topic pages
  useEffect(() => {
    if (isOnTopicPage || !presenceInfo) return;

    const channel = supabase.channel(`presence-topic-${presenceInfo.topicId}`);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ opinionId: presenceInfo.opinionId });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [presenceInfo, isOnTopicPage]);
}
