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
    badge: '/logo-3v.png',
    icon: '/logo-3v.png',
    tag: 'default',
    silent: false,
    requireInteraction: true,
    data: {},
  };

  if (event.data) {
    try {
      const json = event.data.json();
      // Server may wrap payload in { notification: {...} }
      const payload = json.notification || json;
      data = { ...data, ...payload };
    } catch (_error) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      badge: data.badge,
      icon: data.icon,
      // Large hero image (WhatsApp-style rich preview, supported on Android)
      image: data.image,
      tag: data.tag,
      renotify: data.renotify ?? true,
      requireInteraction: data.requireInteraction,
      silent: data.silent ?? false,
      vibrate: data.vibrate || [300, 100, 300, 100, 500],
      timestamp: data.timestamp || Date.now(),
      // Action buttons (Android shows up to 2)
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
      data: data.data || data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const payload = event.notification.data || {};
  let urlToOpen = payload.url || '/';

  // Action button clicked
  if (event.action === 'join') {
    urlToOpen = payload.joinUrl || payload.url || '/calls-lives';
  } else if (event.action === 'remind') {
    urlToOpen = payload.url || '/calls-lives';
  } else if (event.action === 'dismiss') {
    return; // just close
  }

  if (!payload.url && payload.action) {
    switch (payload.action) {
      case 'careme':
        urlToOpen = '/careme-2026';
        break;
      case 'chemin-croix':
        urlToOpen = '/chemin-de-croix';
        break;
      case 'activity':
        urlToOpen = '/activities';
        break;
      case 'bible':
        urlToOpen = '/biblical-reading';
        break;
      case 'gallery':
        urlToOpen = '/gallery';
        break;
      case 'live':
      case 'session':
        urlToOpen = '/calls-lives';
        break;
      case 'call':
      case 'welcome':
      case 'reminder':
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
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            payload: {
              action: payload.action,
              data: payload,
            },
          });
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
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const notification = event.data.payload;
    self.registration.showNotification(notification.title, {
      body: notification.body,
      badge: notification.badge || '/logo-3v.png',
      icon: notification.icon || '/logo-3v.png',
      tag: notification.tag || `notification-${Date.now()}`,
      requireInteraction: notification.requireInteraction ?? true,
      silent: notification.silent ?? false,
      vibrate: notification.vibrate || [200, 100, 200],
      data: notification.data || {},
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
