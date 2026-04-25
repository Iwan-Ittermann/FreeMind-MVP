import { setPrefs } from '@/lib/tt-notification-prefs';

export type TTNotificationPermissionResult = NotificationPermission | 'unsupported' | 'unavailable';

export function browserNotificationsUnavailable() {
  if (typeof window === 'undefined' || !('Notification' in window)) return true;
  return false;
}

export async function requestBrowserNotificationPermission(): Promise<TTNotificationPermissionResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (browserNotificationsUnavailable()) return 'unavailable';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

export async function enableTopicNotificationsWithPermission(topicId: string) {
  const permission = await requestBrowserNotificationPermission();
  if (permission === 'granted') {
    enableTopicNotifications(topicId);
  }
  return permission;
}

export function enableTopicNotifications(topicId: string) {
  setPrefs(topicId, { enabled: true });
  window.dispatchEvent(
    new CustomEvent('tt:subscription-changed', {
      detail: { topicId, enabled: true },
    }),
  );
}
