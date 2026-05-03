/* ── Notification Service Worker — Voie Vérité Vie ─────────────────────── */

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

/* ── Classify notification payload ──────────────────────────────────────── */
function classifyPayload(payload) {
  const action = payload.action || '';
  const isCall = action === 'call';
  const isLive = action === 'live' || action === 'session';
  const isFeast = action === 'feast';
  const isUrgent = isCall || isLive;
  return { isCall, isLive, isFeast, isUrgent };
}

/* ── Build notification options from payload ─────────────────────────── */
function buildOptions(payload) {
  const { isCall, isLive, isFeast, isUrgent } = classifyPayload(payload);

  const actions = isCall
    ? [
        { action: 'join',    title: '📞 Rejoindre' },
        { action: 'dismiss', title: 'Ignorer' },
      ]
    : isLive
    ? [
        { action: 'join',    title: '▶️ Voir le live' },
        { action: 'dismiss', title: 'Plus tard' },
      ]
    : isFeast
    ? [
        { action: 'open',    title: '🙏 Voir la célébration' },
        { action: 'dismiss', title: 'Fermer' },
      ]
    : [
        { action: 'open',    title: 'Ouvrir' },
        { action: 'dismiss', title: 'Fermer' },
      ];

  const vibrate = isCall
    ? [400, 200, 400, 200, 600, 200, 600]
    : isLive
    ? [300, 150, 300, 150, 500]
    : isFeast
    ? [200, 100, 200, 100, 200]
    : (payload.vibrate || [200, 100, 200]);

  const badge = payload.badge || '/badge-72x72.png';
  const icon  = payload.icon  || '/icon-192x192.png';

  /* WhatsApp-style: call/live notifications always require interaction and aren't silent */
  return {
    body:               payload.body || '',
    badge,
    icon,
    image:              payload.image,
    tag:                payload.tag || (isUrgent ? `urgent-${action}` : `notification-${Date.now()}`),
    renotify:           true,
    requireInteraction: isUrgent || isFeast ? true : (payload.requireInteraction ?? false),
    silent:             isUrgent ? false : (isFeast ? false : (payload.silent ?? true)),
    vibrate,
    timestamp:          Date.now(),
    actions,
    data: {
      ...(payload.data || {}),
      action:     payload.action,
      url:        payload.data?.url || payload.url || '/',
      roomId:     payload.data?.roomId || payload.roomId,
      meetingUrl: payload.data?.meetingUrl || payload.meetingUrl,
    },
  };
}

/* ── Resolve URL to open on click ────────────────────────────────────── */
function resolveUrl(payload, action) {
  if (action === 'dismiss') return null;

  if (payload.meetingUrl) return payload.meetingUrl;
  if (payload.url && payload.url !== '/') return payload.url;
  if (payload.roomId) return `/meeting/${payload.roomId}`;

  switch (payload.action) {
    case 'call':
    case 'live':
    case 'session':  return '/calls-lives';
    case 'feast':    return '/';
    case 'careme':   return '/careme-2026';
    case 'chemin-croix': return '/chemin-de-croix';
    case 'bible':    return '/biblical-reading';
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
  if (!urlToOpen) return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of clients) {
        if ('focus' in client) {
          try {
            await client.navigate(urlToOpen);
            await client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: { action: payload.action, url: urlToOpen, data: payload },
            });
            return;
          } catch {}
        }
      }

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

  /* WhatsApp-style call ring — play audio via client-side Audio API */
  if (event.data.type === 'CALL_RING') {
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'PLAY_RING', payload: event.data.payload }));
    });
  }
});
