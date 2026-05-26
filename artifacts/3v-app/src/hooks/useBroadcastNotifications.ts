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
  const pollingRef = useRef<number | null>(null);

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

    const handleCallRing = (n: { id: string; title: string; message?: string; body?: string; type: string; link?: string | null }) => {
      const isCall = n.type === 'call';
      const url = n.link || '/calls-lives';

      if (isCall) {
        stopRinging();
        void playAttentionTone();
        let ringCount = 0;
        ringIntervalRef.current = window.setInterval(() => {
          ringCount += 1;
          if (ringCount >= 12) { stopRinging(); return; }
          void playAttentionTone();
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

      toast.custom(
        (toastId) =>
          createElement(NotificationToast, {
            title: n.title,
            message: n.message || n.body || '',
            type: n.type as NotifType,
            link: n.link || undefined,
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
    };

    // Poll for new notifications via API
    const pollNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (!res.ok) return;
        const rows: any[] = await res.json();
        if (!rows.length) return;

        const newest = rows[0];
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = newest.id;
          return;
        }
        if (newest.id === lastSeenIdRef.current) return;

        const newRows = rows.filter(r => r.id !== lastSeenIdRef.current);
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

    return () => {
      stopRinging();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingRef.current) window.clearInterval(pollingRef.current);
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
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, link }),
      });
      if (!res.ok) throw new Error('Failed to broadcast');
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  async sendToRole(
    title: string,
    message: string,
    role: 'user' | 'admin',
    type: AppNotificationType = 'announcement',
    _icon?: string,
    link: string | null = null
  ) {
    try {
      const res = await fetch('/api/notifications/broadcast-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, role, type, link }),
      });
      if (!res.ok) throw new Error('Failed to broadcast to role');
      return { error: null };
    } catch (err) {
      return { error: err };
    }
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
