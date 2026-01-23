import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresencePayload {
  opinionId: string;
}

export function usePresence(topicId: string, currentUserOpinionId: string | null | undefined) {
  const [onlineOpinionIds, setOnlineOpinionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!topicId) return;

    const channel = supabase.channel(`presence-topic-${topicId}`);

    const updatePresenceState = () => {
      const state = channel.presenceState<PresencePayload>();
      const opinionIds = new Set<string>();
      
      // Extract all opinion IDs from presence state
      Object.values(state).forEach(presences => {
        presences.forEach((presence) => {
          if (presence.opinionId) {
            opinionIds.add(presence.opinionId);
          }
        });
      });
      
      setOnlineOpinionIds(opinionIds);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, updatePresenceState)
      .on('presence', { event: 'leave' }, updatePresenceState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserOpinionId) {
          // Track current user's presence
          await channel.track({
            opinionId: currentUserOpinionId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, currentUserOpinionId]);

  return { onlineOpinionIds };
}
