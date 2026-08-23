/* Messaging-only service worker for freemind Web Push.
   Deliberately contains NO app-shell caching — it must never serve HTML. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'freemind', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'freemind';
  const options = {
    body: data.body || '',
    icon: '/app-icon-192.png',
    badge: '/app-icon-192.png',
    tag: data.tag || 'freemind',
    renotify: true,
    data: { link: data.link || '/go' },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      if (typeof data.badge === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
        try {
          if (data.badge > 0) await self.navigator.setAppBadge(data.badge);
          else await self.navigator.clearAppBadge();
        } catch {
          /* Badging unavailable */
        }
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/go';
  const target = new URL(link, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
