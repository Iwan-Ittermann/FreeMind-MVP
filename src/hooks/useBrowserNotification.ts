import { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const STORAGE_KEY_PREFIX = 'notify-topic-';

export function useBrowserNotification(
  unreadCount: number,
  baseTitle: string = 'freemind',
  topicId?: string,
) {
  const { t } = useTranslation();
  const prevUnreadRef = useRef(unreadCount);

  const [enabled, setEnabledState] = useState(() => {
    if (!topicId) return false;
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${topicId}`) === 'true';
  });

  // Update document title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount, baseTitle]);

  // Fire browser notification when unread count increases
  useEffect(() => {
    if (!enabled || !topicId) return;
    if (unreadCount > prevUnreadRef.current && document.hidden) {
      try {
        const n = new Notification(t('notifications.newMessage'), {
          body: t('notifications.newMessageBody', { count: unreadCount }),
          icon: '/placeholder.svg',
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // Notification API unavailable
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, enabled, topicId, t]);

  const toggleNotifications = useCallback(() => {
    if (!topicId) return;

    if (!('Notification' in window)) {
      toast.error(t('notifications.unsupported'));
      return;
    }

    if (enabled) {
      // Turn off
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${topicId}`);
      setEnabledState(false);
      toast.info(t('notifications.disabled'));
      return;
    }

    // Turn on — request permission first
    if (Notification.permission === 'denied') {
      toast.error(t('notifications.denied'));
      return;
    }

    if (Notification.permission === 'granted') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${topicId}`, 'true');
      setEnabledState(true);
      toast.success(t('notifications.enabled'));
      return;
    }

    // Default — prompt
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${topicId}`, 'true');
        setEnabledState(true);
        toast.success(t('notifications.enabled'));
      } else if (perm === 'denied') {
        toast.error(t('notifications.denied'));
      }
    });
  }, [enabled, topicId, t]);

  return { notificationsEnabled: enabled, toggleNotifications };
}
