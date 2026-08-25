import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StoredNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  chat_id: string | null;
  topic_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** Sets/clears the app icon badge (installed home-screen apps). */
export function setAppBadge(count: number) {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) {
      void nav.setAppBadge(count);
    } else if (nav.clearAppBadge) {
      void nav.clearAppBadge();
    }
  } catch {
    // Badging API unavailable — ignore.
  }
}

/**
 * Persisted notifications for the current user.
 *
 * Reads the `notifications` table, keeps it in sync via realtime inserts and
 * mirrors the unread count onto the app icon badge.
 */
export function useStoredNotifications(topicId?: string | null) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    let query = supabase
      .from('notifications')
      .select('id, type, title, body, link, chat_id, topic_id, read_at, created_at')
      // New chat messages are already surfaced via unread badges in the chat list.
      .neq('type', 'message');
    // Scope to the current topic (general notifications have no topic).
    if (topicId) query = query.or(`topic_id.eq.${topicId},topic_id.is.null`);
    const { data } = await query.order('created_at', { ascending: false }).limit(100);
    setNotifications((data as StoredNotification[]) ?? []);
    setLoading(false);
  }, [user, topicId]);


  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: new notifications for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('stored-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as StoredNotification;
          if (row.type === 'message') return;
          if (topicId && row.topic_id && row.topic_id !== topicId) return;

          setNotifications((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 100),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, topicId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // NOTE: the app icon badge is set by `useAppBadge` at the screen level, so it
  // can combine unread notifications with unread chat messages.


  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    await supabase.rpc('mark_notifications_read');
  }, [user]);

  return { notifications, unreadCount, loading, markAllRead, reload: load };
}
