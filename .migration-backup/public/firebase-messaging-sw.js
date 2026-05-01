// Firebase Cloud Messaging Service Worker
// Handles background push notifications (app closed, screen off, other app open)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push messages (works even when app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Voie Vérité Vie',
    body: 'Vous avez une nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      const json = event.data.json();
      // FCM format: { notification: {...}, data: {...} }
      if (json.notification) {
        data.title = json.notification.title || data.title;
        data.body = json.notification.body || data.body;
        data.icon = json.notification.icon || data.icon;
        data.badge = json.notification.badge || data.badge;
        data.tag = json.notification.tag || data.tag;
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
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || `push-${Date.now()}`,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Fermer' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click — navigate to the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

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

      // Try to focus an existing window
      for (const client of allClients) {
        if ('focus' in client) {
          await client.navigate(urlToOpen);
          return client.focus();
        }
      }

      // Otherwise open a new window
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
