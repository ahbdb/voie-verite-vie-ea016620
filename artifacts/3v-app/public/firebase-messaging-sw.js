/* ── Firebase Messaging Service Worker — Voie Vérité Vie ───────────────
   Handles background push notifications (app closed, screen off).
   Same URL-resolution logic as notification-sw.js.
─────────────────────────────────────────────────────────────────────── */

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

function resolveUrl(payload, action) {
  if (action === 'dismiss') return null;
  if (payload.meetingUrl) return payload.meetingUrl;
  if (payload.url && payload.url !== '/') return payload.url;
  if (payload.roomId) return `/meeting/${payload.roomId}`;
  switch (payload.action) {
    case 'call':
    case 'live':
    case 'session':      return '/calls-lives';
    case 'careme':       return '/careme-2026';
    case 'chemin-croix': return '/chemin-de-croix';
    case 'bible':        return '/biblical-reading';
    case 'activity':     return '/activities';
    case 'gallery':      return '/gallery';
    default:             return '/';
  }
}

self.addEventListener('push', (event) => {
  let title = '🔔 Voie Vérité Vie';
  let opts = {
    body: 'Vous avez une nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `push-${Date.now()}`,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    renotify: true,
    data: {},
    actions: [
      { action: 'open',    title: 'Ouvrir' },
      { action: 'dismiss', title: 'Fermer' },
    ],
  };

  if (event.data) {
    try {
      const json = event.data.json();
      // FCM wraps in { notification, data } — handle both formats
      const notif = json.notification || json;
      title            = notif.title || title;
      opts.body        = notif.body  || opts.body;
      opts.icon        = notif.icon  || opts.icon;
      opts.badge       = notif.badge || opts.badge;
      opts.tag         = notif.tag   || opts.tag;
      opts.image       = notif.image;

      const d = { ...(json.data || {}), ...(notif.data || {}) };
      opts.data = d;

      // Call / live notification
      const isCall = d.action === 'call' || d.action === 'live' || d.action === 'session';
      if (isCall) {
        opts.requireInteraction = true;
        opts.silent = false;
        opts.vibrate = [300, 150, 300, 150, 500, 150, 500];
        opts.tag = 'call-notification';
        opts.actions = [
          { action: 'join',    title: '📞 Rejoindre' },
          { action: 'dismiss', title: 'Ignorer' },
        ];
      }
    } catch {
      opts.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const urlToOpen = resolveUrl(payload, event.action);
  if (!urlToOpen) return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          try {
            await client.navigate(urlToOpen);
            return client.focus();
          } catch {}
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
