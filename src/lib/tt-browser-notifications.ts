import { setPrefs } from '@/lib/tt-notification-prefs';

export type TTNotificationPermissionResult = NotificationPermission | 'unsupported' | 'unavailable';

export function browserNotificationsUnavailable() {
  if (typeof window === 'undefined' || !('Notification' in window)) return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
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
    setPrefs(topicId, { enabled: true });
    window.dispatchEvent(
      new CustomEvent('tt:subscription-changed', {
        detail: { topicId, enabled: true },
      }),
    );
  }
  return permission;
}
