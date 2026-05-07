import { useEffect, useRef } from 'react';

/**
 * Keeps the call alive when the user leaves the page without hanging up,
 * exactly like WhatsApp:
 *
 * 1. Shows a persistent "call in progress" notification via the SW so
 *    the user sees it in the system tray.
 * 2. Sends a periodic heartbeat to Supabase to prevent the participant
 *    row from being marked inactive.
 * 3. Registers a `beforeunload` warning when the call is active.
 * 4. Stores the active room id in sessionStorage so the app can detect
 *    an interrupted call on next launch and offer to rejoin.
 */

const HEARTBEAT_INTERVAL_MS = 15_000;
const SESSION_KEY = '3v-active-call-room';

export interface CallKeepAliveOptions {
  isConnected: boolean;
  roomId: string | undefined;
  roomTitle: string | undefined;
  onHeartbeat: () => Promise<void>;
}

export function useCallKeepAlive({
  isConnected,
  roomId,
  roomTitle,
  onHeartbeat,
}: CallKeepAliveOptions): void {
  const heartbeatRef = useRef<number | null>(null);
  const notifShownRef = useRef(false);

  // ── Persist active-call room in sessionStorage ──────────────────────────
  useEffect(() => {
    if (isConnected && roomId) {
      sessionStorage.setItem(SESSION_KEY, roomId);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [isConnected, roomId]);

  // ── beforeunload warning ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Un appel est en cours. Voulez-vous vraiment quitter ?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isConnected]);

  // ── Heartbeat to Supabase ────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }
    heartbeatRef.current = window.setInterval(() => {
      void onHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isConnected, onHeartbeat]);

  // ── Persistent SW notification while in background ──────────────────────
  useEffect(() => {
    if (!isConnected || !roomId) {
      notifShownRef.current = false;
      return;
    }

    const showCallNotification = async () => {
      if (notifShownRef.current) return;
      if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg?.showNotification) return;
        notifShownRef.current = true;
        await reg.showNotification('📞 Appel en cours — Voie Vérité Vie', {
          body: roomTitle ? `Réunion : ${roomTitle}` : 'Appel en cours…',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: `active-call-${roomId}`,
          renotify: false,
          requireInteraction: true,
          silent: true,
          data: { action: 'call', roomId, url: `/meeting/${roomId}` },
          actions: [
            { action: 'join', title: '📞 Revenir' },
            { action: 'dismiss', title: '🔴 Raccrocher' },
          ],
        } as any);
      } catch {}
    };

    const closeCallNotification = async () => {
      notifShownRef.current = false;
      if (!('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg?.getNotifications) return;
        const notifs = await reg.getNotifications({ tag: `active-call-${roomId}` });
        notifs.forEach((n) => n.close());
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void showCallNotification();
      } else {
        void closeCallNotification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    // If we're already hidden when this effect runs, show immediately
    if (document.visibilityState === 'hidden') void showCallNotification();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      void closeCallNotification();
    };
  }, [isConnected, roomId, roomTitle]);
}

/** Returns the room id of an interrupted call (if any) */
export function getInterruptedCallRoom(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}
