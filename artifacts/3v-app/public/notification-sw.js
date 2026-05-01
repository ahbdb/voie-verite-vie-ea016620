/* ── Notification Service Worker — Voie Vérité Vie ─────────────────────── */

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

/* ── Build notification options from payload ─────────────────────────── */
function buildOptions(payload) {
  const isCall = payload.action === 'call' || payload.action === 'live' || payload.action === 'session';
  const actions = isCall
    ? [
        { action: 'join',    title: '📞 Rejoindre' },
        { action: 'dismiss', title: 'Ignorer' },
      ]
    : [
        { action: 'open',    title: 'Ouvrir' },
        { action: 'dismiss', title: 'Fermer' },
      ];

  return {
    body:              payload.body || '',
    badge:             payload.badge || '/badge-72x72.png',
    icon:              payload.icon  || '/icon-192x192.png',
    image:             payload.image,
    tag:               payload.tag   || (isCall ? 'call-notification' : `notification-${Date.now()}`),
    renotify:          true,
    requireInteraction: isCall ? true : (payload.requireInteraction ?? false),
    silent:            isCall ? false : (payload.silent ?? true),
    vibrate:           isCall
                         ? [300, 150, 300, 150, 500, 150, 500]
                         : (payload.vibrate || [200, 100, 200]),
    timestamp:         Date.now(),
    actions,
    data: {
      ...(payload.data || {}),
      action:    payload.action,
      url:       payload.data?.url || payload.url || '/',
      roomId:    payload.data?.roomId || payload.roomId,
      meetingUrl: payload.data?.meetingUrl || payload.meetingUrl,
    },
  };
}

/* ── Resolve URL to open ─────────────────────────────────────────────── */
function resolveUrl(payload, action) {
  if (action === 'dismiss') return null;

  // Direct URL takes priority
  if (payload.meetingUrl) return payload.meetingUrl;
  if (payload.url && payload.url !== '/') return payload.url;
  if (payload.roomId)   return `/meeting/${payload.roomId}`;

  switch (payload.action) {
    case 'call':
    case 'live':
    case 'session': return '/calls-lives';
    case 'careme':  return '/careme-2026';
    case 'chemin-croix': return '/chemin-de-croix';
    case 'bible':   return '/biblical-reading';
    case 'activity': return '/activities';
    case 'gallery':  return '/gallery';
    default:         return '/';
  }
}

/* ── Push event — show notification even when app is closed ──────────── */
self.addEventListener('push', (event) => {
  let payload = {
    title: '🔔 Voie Vérité Vie',
    body:  'Vous avez une nouvelle notification',
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...(json.notification || json) };
      if (json.data) payload.data = { ...payload.data, ...json.data };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, buildOptions(payload))
  );
});

/* ── Notification click ──────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const payload = event.notification.data || {};
  const urlToOpen = resolveUrl(payload, event.action);
  if (!urlToOpen) return; // dismissed

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Try to focus an existing window and navigate it
      for (const client of clients) {
        if ('focus' in client) {
          try {
            await client.navigate(urlToOpen);
            await client.focus();
            // Also post a message so the React app can navigate via router
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: { action: payload.action, url: urlToOpen, data: payload },
            });
            return;
          } catch {}
        }
      }

      // No window open — open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

/* ── Message from app ────────────────────────────────────────────────── */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const n = event.data.payload || {};
    self.registration.showNotification(n.title || '🔔 Voie Vérité Vie', buildOptions(n));
  }
});
