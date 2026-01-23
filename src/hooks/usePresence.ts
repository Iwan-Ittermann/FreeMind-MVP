import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  opinionId: string;
  oderId: string;
}

export function usePresence(topicId: string, currentUserOpinionId: string | null | undefined) {
  const [onlineOpinionIds, setOnlineOpinionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!topicId) return;

    const channel = supabase.channel(`presence-topic-${topicId}`, {
      config: {
        presence: {
          key: currentUserOpinionId || 'anonymous',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const opinionIds = new Set<string>();
        
        // Extract all opinion IDs from presence state
        Object.values(state).forEach(presences => {
          presences.forEach((presence: PresenceState) => {
            if (presence.opinionId) {
              opinionIds.add(presence.opinionId);
            }
          });
        });
        
        setOnlineOpinionIds(opinionIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserOpinionId) {
          // Track current user's presence
          await channel.track({
            opinionId: currentUserOpinionId,
            oderId: currentUserOpinionId, // Using opinionId as unique identifier
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, currentUserOpinionId]);

  return { onlineOpinionIds };
}
