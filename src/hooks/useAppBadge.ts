import { useEffect } from 'react';
import { setAppBadge } from '@/hooks/useStoredNotifications';

/**
 * Mirrors a combined unread count onto the installed home-screen app icon.
 *
 * Must include BOTH unread notifications and unread chat messages — chat
 * messages are hidden from the notification panel but still need to show up
 * on the app icon.
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    setAppBadge(count);
  }, [count]);
}
