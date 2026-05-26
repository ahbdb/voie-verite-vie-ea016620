import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playAttentionTone, sendVisibleNotification } from '@/lib/notification-service';
import { createElement } from 'react';
import { NotificationToast, type NotifType } from '@/components/NotificationToast';

export type AppNotificationType =
  | 'greeting'
  | 'reminder'
  | 'announcement'
  | 'update'
  | 'reading'
  | 'activity'
  | 'prayer'
  | 'info'
  | 'call'
  | 'bible'
  | 'feast';

export const useBroadcastNotifications = () => {
  const { user } = useAuth();
  const ringIntervalRef = useRef<number | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const activeCallRoomIdRef = useRef<string | null>(null);
  const activeCallToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const stopRinging = () => {
      if (ringIntervalRef.current) {
        window.clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };

    const stopCallToast = () => {
      stopRinging();
      if (activeCallToastIdRef.current !== null) {
        toast.dismiss(activeCallToastIdRef.current);
        activeCallToastIdRef.current = null;
      }
      activeCallRoomIdRef.current = null;
    };

    const handleCallRing = (n: { id: string; title: string; message?: string; body?: string; type: string; link?: string | null }) => {
      const isCall = n.type === 'call';
      const url = n.link || '/calls-lives';

      if (isCall) {
        stopCallToast();
        // Extract roomId from link e.g. /meeting/<id>
        const roomId = n.link?.split('/meeting/')[1] || null;
        if (roomId) activeCallRoomIdRef.current = roomId;

        void playAttentionTone();
        // Vibrate on Android for physical feedback
        if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 600]);
        let ringCount = 0;
        ringIntervalRef.current = window.setInterval(() => {
          ringCount += 1;
          if (ringCount >= 12) { stopRinging(); return; }
          void playAttentionTone();
          if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
          void sendVisibleNotification({
            title: n.title,
            body: n.message || n.body || '',
            tag: `call-${n.id}`,
            action: 'call',
            silent: false,
            requireInteraction: true,
            data: { url },
          });
        }, 3000);
      }

      void sendVisibleNotification({
        title: n.title,
        body: n.message || n.body || '',
        tag: `${n.type}-${n.id}`,
        action: isCall ? 'call' : 'reminder',
        silent: false,
        requireInteraction: isCall,
        data: { url },
      });

      const toastId = toast.custom(
        (id) =>
          createElement(NotificationToast, {
            title: n.title,
            message: n.message || n.body || '',
            type: n.type as NotifType,
            link: n.link || undefined,
            isCall,
            onOpen: () => {
              stopCallToast();
              toast.dismiss(id);
              if (n.link) window.location.href = n.link;
            },
            onDismiss: () => {
              stopCallToast();
              toast.dismiss(id);
            },
          }),
        { duration: isCall ? 20000 : 7000, position: 'top-right' }
      );
      if (isCall) activeCallToastIdRef.current = toastId;
    };

    // Poll for new notifications via Supabase
    const pollNotifications = async () => {
      try {
        const { data: rows, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error || !rows?.length) return;

        const newest = rows[0];
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = newest.id;
          return;
        }
        if (newest.id === lastSeenIdRef.current) return;

        const newRows = rows.filter((r: any) => r.id !== lastSeenIdRef.current);
        lastSeenIdRef.current = newest.id;
        for (const n of newRows) {
          handleCallRing(n);
        }
      } catch {
        // silent
      }
    };

    void pollNotifications();
    pollingRef.current = window.setInterval(pollNotifications, 30000);

    // Realtime — sonne instantanément dès qu'une notification est insérée
    const notifChannel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { id: string; title: string; message?: string; body?: string; type: string; link?: string | null };
          if (!n?.id) return;
          lastSeenIdRef.current = n.id;
          handleCallRing(n);
        }
      )
      .subscribe();

    // Realtime — ferme le popup immédiatement quand l'admin termine l'appel
    const roomChannel = supabase
      .channel('room-ended-watcher')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'video_rooms' },
        (payload) => {
          const room = payload.new as { id: string; status: string };
          if (room.status === 'ended' && room.id === activeCallRoomIdRef.current) {
            stopCallToast();
          }
        }
      )
      .subscribe();

    return () => {
      stopRinging();
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [user?.id]);
};

export const broadcastNotificationService = {
  async sendToAll(
    title: string,
    message: string,
    type: AppNotificationType = 'announcement',
    _icon?: string,
    link: string | null = null
  ) {
    const isCall = type === 'call';

    // 1. Web Push via Edge Function — fonctionne en production (Netlify) même téléphone éteint.
    //    L'Edge Function utilise VAPID + service-role Supabase → atteint tous les appareils inscrits.
    supabase.functions.invoke('send-push-notification', {
      body: {
        title,
        body: message,
        action: type,
        url: link || '/',
        requireInteraction: isCall,
        vibrate: isCall ? [400, 200, 400, 200, 600, 200, 600] : [200, 100, 200],
        tag: isCall ? `call-${Date.now()}` : undefined,
      },
    }).catch((e) => console.warn('send-push-notification:', e));

    // 2. API server (dev/Replit) — insère les lignes en DB pour le pickup Supabase Realtime.
    //    Sur Netlify cette route n'existe pas : on ignore l'erreur proprement.
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, link }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) return { error: null };
    } catch { /* API server absent — normal en production */ }

    return { error: null };
  },

  async sendToRole(
    title: string,
    message: string,
    role: 'user' | 'admin',
    type: AppNotificationType = 'announcement',
    _icon?: string,
    link: string | null = null
  ) {
    const isCall = type === 'call';

    // Web Push — envoie à tous (l'Edge Function ne filtre pas par rôle côté client)
    supabase.functions.invoke('send-push-notification', {
      body: {
        title,
        body: message,
        action: type,
        url: link || '/',
        requireInteraction: isCall,
        vibrate: isCall ? [400, 200, 400, 200, 600, 200, 600] : [200, 100, 200],
      },
    }).catch((e) => console.warn('send-push-notification:', e));

    try {
      const res = await fetch('/api/notifications/broadcast-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, role, type, link }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) return { error: null };
    } catch { /* API server absent */ }

    return { error: null };
  },

  async sendDailyGreeting() {
    return this.sendToAll(
      '👋 Bonjour!',
      'Que ce jour soit rempli de paix et de bénédictions',
      'greeting'
    );
  },

  async sendReminder(title: string, message: string, _icon?: string) {
    return this.sendToAll(title, message, 'reminder', _icon);
  },

  async sendAnnouncement(title: string, message: string, _icon?: string) {
    return this.sendToAll(title, message, 'announcement', _icon);
  },

  async sendUpdate(title: string, message: string, _icon?: string) {
    return this.sendToAll(title, message, 'update', _icon);
  },
};

export const testNotificationSystem = async () => {
  try {
    await broadcastNotificationService.sendToAll(
      '🧪 Test Notification',
      'Ceci est un test du système de notifications.',
      'announcement'
    );
    return { success: true, message: 'Notification de test envoyée !' };
  } catch (error) {
    console.error('Erreur test notification:', error);
    return { success: false, message: "Erreur lors de l'envoi du test" };
  }
};
