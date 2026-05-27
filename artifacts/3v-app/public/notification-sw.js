/* ── Notification + PWA Service Worker — Voie Vérité Vie ────────────────── */

const CANONICAL_ORIGIN = 'https://voieveritevie.org';
const CACHE_NAME = 'vvv-shell-v1';
const SHELL_URLS = ['/', '/manifest.json', '/icon-192x192.png', '/badge-72x72.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Pré-cache le shell de l'app pour le mode hors-ligne
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Supprimer les anciens caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

/* ── Fetch : redirection si ancien domaine + support hors-ligne ────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Si l'utilisateur est sur l'ancien domaine → rediriger vers le nouveau
  if (url.origin !== CANONICAL_ORIGIN && request.mode === 'navigate') {
    event.respondWith(
      Response.redirect(CANONICAL_ORIGIN + url.pathname + url.search, 301)
    );
    return;
  }

  // Navigation requests : réseau d'abord, cache shell en fallback (hors-ligne)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((r) => r || fetch(request))
      )
    );
    return;
  }

  // Tous les autres assets : réseau normal (pas de cache agressif)
});

/* ── Classify notification payload ──────────────────────────────────────── */
function classifyPayload(payload) {
  // action can be at top level (new format) or nested in data (old format)
  const action = payload.action || payload.data?.action || '';
  const isCall = action === 'call';
  const isLive = action === 'live' || action === 'session';
  const isFeast = action === 'feast';
  const isActiveCall = (payload.tag || '').startsWith('active-call-');
  const isUrgent = isCall || isLive || isActiveCall;
  return { isCall, isLive, isFeast, isUrgent, isActiveCall };
}

/* ── Build notification options from payload ─────────────────────────── */
function buildOptions(payload) {
  const { isCall, isLive, isFeast, isUrgent, isActiveCall } = classifyPayload(payload);

  const actions = isActiveCall
    ? [
        { action: 'join',    title: '📞 Revenir à l\'appel' },
        { action: 'hangup',  title: '🔴 Raccrocher' },
      ]
    : isCall
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

  const vibrate = isCall || isActiveCall
    ? [400, 200, 400, 200, 600, 200, 600]
    : isLive
    ? [300, 150, 300, 150, 500]
    : isFeast
    ? [200, 100, 200, 100, 200]
    : (payload.vibrate || [200, 100, 200]);

  const badge = payload.badge || '/badge-72x72.png';
  const icon  = payload.icon  || '/icon-192x192.png';

  return {
    body:               payload.body || '',
    badge,
    icon,
    image:              payload.image,
    tag:                payload.tag || (isUrgent ? `urgent-${payload.action}` : `notification-${Date.now()}`),
    renotify:           isActiveCall ? false : true,
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
  if (action === 'dismiss' || action === 'hangup') return null;

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

  const { isCall } = classifyPayload(payload);

  event.waitUntil(
    self.registration.showNotification(payload.title, buildOptions(payload))
      .then(() => {
        // For incoming calls, also message every open client so it can ring
        // with audio (works when the PWA is backgrounded but still in memory).
        if (!isCall) return;
        return self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then((clients) => {
            const ringData = {
              roomId: payload.roomId || payload.data?.roomId || null,
              title:  payload.title,
            };
            clients.forEach((c) => c.postMessage({ type: 'PLAY_RING', payload: ringData }));
          });
      })
  );
});

/* ── Notification click ──────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const payload = event.notification.data || {};
  const clickedAction = event.action;

  // ── "Raccrocher" from the active-call banner notification ──
  if (clickedAction === 'hangup') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // Tell every tab to hang up
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_HANG_UP',
              payload: { roomId: payload.roomId },
            });
          });
          // If no tab is open, open one so the app can clean up server-side
          if (clients.length === 0 && self.clients.openWindow) {
            const url = payload.roomId ? `/meeting/${payload.roomId}?hangup=1` : '/';
            return self.clients.openWindow(url);
          }
        })
    );
    return;
  }

  const urlToOpen = resolveUrl(payload, clickedAction);
  if (!urlToOpen) return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Try to focus an existing tab first
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

      // No existing tab — open a new one
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

  /* WhatsApp-style call ring — relay to all client tabs */
  if (event.data.type === 'CALL_RING') {
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'PLAY_RING', payload: event.data.payload }));
    });
  }
});
