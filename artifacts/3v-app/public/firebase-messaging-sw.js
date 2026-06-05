/* ── Firebase Messaging Service Worker — Voie Vérité Vie ───────────────
   Gère les notifications push en arrière-plan (app fermée, écran éteint).
   Firebase envoie directement ici quand l'app n'est pas ouverte.
─────────────────────────────────────────────────────────────────────── */

importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCkSym5xF-yY27Md_Sv8Ls8yqlpqdeScDA",
  authDomain: "voie-verite-vie-92cd3.firebaseapp.com",
  projectId: "voie-verite-vie-92cd3",
  storageBucket: "voie-verite-vie-92cd3.firebasestorage.app",
  messagingSenderId: "491460650214",
  appId: "1:491460650214:web:05d6554ab528c0753a0727",
});

const messaging = firebase.messaging();

/* ── Résoudre l'URL à ouvrir selon l'action ─────────────────────────── */
function resolveUrl(data) {
  if (data?.url && data.url !== "/") return data.url;
  if (data?.roomId) return `/meeting/${data.roomId}`;
  switch (data?.action) {
    case "call":
    case "live":
    case "session":      return "/calls-lives";
    case "bible":        return "/biblical-reading";
    case "activity":     return "/activities";
    case "gallery":      return "/gallery";
    case "careme":       return "/careme-2026";
    case "chemin-croix": return "/chemin-de-croix";
    case "neuvaines":    return "/neuvaines";
    default:             return "/";
  }
}

/* ── Message reçu en arrière-plan (app fermée) ──────────────────────── */
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data  = payload.data || {};

  const isCall    = data.action === "call" || data.action === "live";
  const isFeast   = data.action === "feast";

  self.registration.showNotification(notif.title || "🔔 Voie Vérité Vie", {
    body:               notif.body || "",
    icon:               notif.icon || "/icon-192x192.png",
    badge:              "/badge-72x72.png",
    tag:                data.tag || notif.tag || `fcm-${Date.now()}`,
    silent:             false,
    requireInteraction: isCall || isFeast,
    vibrate:            isCall ? [400, 200, 400, 200, 600] : [300, 100, 300],
    data: {
      url:    resolveUrl(data),
      action: data.action || "general",
      roomId: data.roomId,
    },
    actions: isCall
      ? [{ action: "join", title: "📞 Rejoindre" }, { action: "dismiss", title: "Ignorer" }]
      : [{ action: "open", title: "Ouvrir" },        { action: "dismiss", title: "Fermer" }],
  });
});

/* ── Clic sur la notification ───────────────────────────────────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
