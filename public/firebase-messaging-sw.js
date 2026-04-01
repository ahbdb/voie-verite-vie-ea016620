// Firebase Messaging Service Worker for push notifications
// This handles background push notifications from FCM

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Voie, Vérité, Vie',
    body: 'Vous avez une nouvelle notification',
    icon: '/logo-3v.png',
    badge: '/logo-3v.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.notification) {
        data = { ...data, ...json.notification };
      }
      if (json.data) {
        data.data = json.data;
      }
    } catch (_e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-3v.png',
    badge: data.badge || '/logo-3v.png',
    tag: data.tag || `push-${Date.now()}`,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const payload = event.notification.data || {};
  let urlToOpen = payload.url || '/';

  if (!payload.url && payload.action) {
    switch (payload.action) {
      case 'morning':
      case 'bible':
        urlToOpen = '/biblical-reading';
        break;
      case 'careme':
        urlToOpen = '/careme-2026';
        break;
      case 'chemin-croix':
        urlToOpen = '/chemin-de-croix';
        break;
      case 'activity':
        urlToOpen = '/activities';
        break;
      case 'gallery':
        urlToOpen = '/gallery';
        break;
      default:
        urlToOpen = '/';
    }
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ('focus' in client) {
          await client.navigate(urlToOpen);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
