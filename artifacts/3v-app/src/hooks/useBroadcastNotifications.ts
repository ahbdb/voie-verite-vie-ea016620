import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const stopRinging = () => {
      if (ringIntervalRef.current) {
        window.clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') stopRinging();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkForNew = async () => {
      try {
        const res = await fetch('/api/notifications?limit=5', { credentials: 'include' });
        if (!res.ok) return;
        const rows = await res.json() as Array<{
          id: string;
          title: string;
          message: string;
          type: AppNotificationType;
          link: string | null;
        }>;
        if (!rows.length) return;

        const newest = rows[0];

        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = newest.id;
          return;
        }

        if (newest.id === lastSeenIdRef.current) return;

        const newRows = rows.filter((r) => r.id !== lastSeenIdRef.current);
        lastSeenIdRef.current = newest.id;

        for (const n of newRows.slice(0, 3)) {
          const isCall = n.type === 'call';
          const url = n.link || '/';

          if (isCall) {
            stopRinging();
            void playAttentionTone();
            let ringCount = 0;
            ringIntervalRef.current = window.setInterval(() => {
              ringCount += 1;
              if (ringCount >= 10 || document.visibilityState === 'visible') {
                stopRinging();
                return;
              }
              void playAttentionTone();
              void sendVisibleNotification({
                title: n.title,
                body: n.message,
                tag: `${n.type}-${n.id}`,
                action: 'call',
                silent: false,
                requireInteraction: true,
                data: { url },
              });
            }, 3500);
          }

          void sendVisibleNotification({
            title: n.title,
            body: n.message,
            tag: `${n.type}-${n.id}`,
            action: isCall ? 'call' : 'reminder',
            silent: false,
            requireInteraction: isCall,
            data: { url },
          });

          toast.custom(
            (toastId) =>
              createElement(NotificationToast, {
                title: n.title,
                message: n.message,
                type: n.type as NotifType,
                link: n.link,
                isCall,
                onOpen: () => {
                  stopRinging();
                  toast.dismiss(toastId);
                  if (n.link) window.location.href = n.link;
                },
                onDismiss: () => {
                  stopRinging();
                  toast.dismiss(toastId);
                },
              }),
            { duration: isCall ? 20000 : 7000, position: 'top-right' }
          );
        }
      } catch {}
    };

    pollIntervalRef.current = window.setInterval(() => void checkForNew(), 15000);
    void checkForNew();

    return () => {
      stopRinging();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
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
    const res = await fetch('/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, message, type, link }),
    });
    if (!res.ok) throw new Error('Failed to broadcast');
    return res.json();
  },

  async sendToRole(
    title: string,
    message: string,
    role: 'admin' | 'user',
    type: AppNotificationType = 'announcement',
    _icon?: string,
    link: string | null = null
  ) {
    const res = await fetch('/api/notifications/broadcast-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, message, role, type, link }),
    });
    if (!res.ok) throw new Error('Failed to broadcast to role');
    return res.json();
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
