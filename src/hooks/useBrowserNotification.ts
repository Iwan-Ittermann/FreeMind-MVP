import { useEffect } from 'react';

export function useBrowserNotification(unreadCount: number, baseTitle: string = 'freemind') {
  useEffect(() => {
    // Update document title with unread count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount, baseTitle]);
}
