import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TTNotification } from '@/components/tt/TTHeader';
import {
  isEnabled,
  isFilterEnabled,
  getSubscribedTopicIds,
} from '@/lib/tt-notification-prefs';

/**
 * Central realtime notification hook for the TT view.
 *
 * Listens to postgres_changes on opinions, chat_messages, and topics.
 * Filters events against user prefs. Fires browser Notifications
 * when the tab is not focused.
 */
export function useTTNotifications(activeTopicId: string) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TTNotification[]>([]);
  const seenIds = useRef(new Set<string>());

  const addNotification = useCallback(
    (n: TTNotification, topicId: string) => {
      if (seenIds.current.has(n.id)) return;
      seenIds.current.add(n.id);
      setNotifications((prev) => [n, ...prev].slice(0, 50));

      // Fire browser notification if tab is not focused
      if (
        document.hidden &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        isEnabled(topicId)
      ) {
        try {
          const bn = new Notification(n.title, {
            body: n.body ?? '',
            icon: '/placeholder.svg',
            tag: n.id,
          });
          bn.onclick = () => {
            window.focus();
            bn.close();
          };
        } catch {
          // Notification API unavailable
        }
      }
    },
    [],
  );

  // Track existing chat IDs to distinguish "new chat" vs "new message"
  const knownChatIds = useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tt-notifications')
      // New opinions
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'opinions' },
        (payload) => {
          const row = payload.new as {
            id: string;
            topic_id: string;
            user_id: string;
            text: string;
          };
          if (row.user_id === user.id) return;
          if (!isFilterEnabled(row.topic_id, 'newOpinion')) return;
          addNotification(
            {
              id: `opinion-${row.id}`,
              type: 'opinion',
              title: 'New opinion added',
              body: row.text?.slice(0, 80),
              unread: true,
            },
            row.topic_id,
          );
        },
      )
      // New messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const row = payload.new as {
            id: string;
            chat_id: string;
            sender_id: string;
            content: string;
          };
          if (row.sender_id === user.id) return;

          // Determine if this is a new chat or an existing one
          const isNewChat = !knownChatIds.current.has(row.chat_id);
          if (isNewChat) knownChatIds.current.add(row.chat_id);

          // Resolve topic_id from the chat
          const { data: chatData } = await supabase
            .from('chats')
            .select('topic_id')
            .eq('id', row.chat_id)
            .single();
          const topicId = chatData?.topic_id;
          if (!topicId) return;

          if (isNewChat) {
            if (!isFilterEnabled(topicId, 'newChat')) return;
            addNotification(
              {
                id: `newchat-${row.chat_id}`,
                type: 'message',
                title: 'New conversation started',
                body: row.content?.slice(0, 80),
                unread: true,
              },
              topicId,
            );
          } else {
            if (!isFilterEnabled(topicId, 'newMessage')) return;
            addNotification(
              {
                id: `msg-${row.id}`,
                type: 'message',
                title: 'New message',
                body: row.content?.slice(0, 80),
                unread: true,
              },
              topicId,
            );
          }
        },
      )
      // New topics
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'topics' },
        (payload) => {
          const row = payload.new as { id: string; title: string };
          // Check if any subscribed topic has newTopic enabled
          const anyEnabled = getSubscribedTopicIds().some((tid) =>
            isFilterEnabled(tid, 'newTopic'),
          );
          if (!anyEnabled) return;
          addNotification(
            {
              id: `topic-${row.id}`,
              type: 'opinion',
              title: 'New topic available',
              body: row.title,
              unread: true,
            },
            activeTopicId,
          );
        },
      )
      .subscribe();

    // Seed known chat IDs so we can distinguish new chats
    supabase
      .from('chats')
      .select('id')
      .then(({ data }) => {
        data?.forEach((c) => knownChatIds.current.add(c.id));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeTopicId, addNotification]);

  // Listen for subscription changes to re-evaluate
  useEffect(() => {
    const handler = () => {
      // Force re-render to pick up pref changes
      setNotifications((prev) => [...prev]);
    };
    window.addEventListener('tt:subscription-changed', handler);
    return () => window.removeEventListener('tt:subscription-changed', handler);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return { notifications, unreadCount, markAllRead };
}
