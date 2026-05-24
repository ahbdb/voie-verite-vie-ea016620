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

    // Récupérer les notifications existantes
    const loadInitialNotifications = async () => {
      try {
        const { data: rows } = await supabase
          .from('user_notifications')
          .select('id, title, message, type, link')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (rows && rows.length > 0) {
          const newest = rows[0];
          lastSeenIdRef.current = newest.id;
        }
      } catch {
        // Silently fail
      }
    };

    void loadInitialNotifications();

    // S'abonner aux nouvelles notifications via Realtime
    const channel = supabase
      .channel(`user_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          
          if (lastSeenIdRef.current === null) {
            lastSeenIdRef.current = n.id;
            return;
          }

          if (n.id === lastSeenIdRef.current) return;
          lastSeenIdRef.current = n.id;

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
      )
      .subscribe();

    return () => {
      stopRinging();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void channel.unsubscribe();
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Créer la notification de broadcast
      const { error } = await supabase
        .from('broadcast_notifications')
        .insert({
          title,
          body: message,
          type,
          target_role: 'all',
          created_by: authUser.id,
          is_sent: true,
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Envoyer via RPC si elle existe
      try {
        await (supabase.rpc as any)('send_broadcast_notification', {
          p_title: title,
          p_body: message,
          p_type: type,
          p_target_role: 'all',
          p_link: link,
        });
      } catch {
        // RPC might not exist, continue anyway
      }

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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Créer la notification de broadcast
      const { error } = await supabase
        .from('broadcast_notifications')
        .insert({
          title,
          body: message,
          type,
          target_role: role,
          created_by: authUser.id,
          is_sent: true,
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Envoyer via RPC si elle existe
      try {
        await (supabase.rpc as any)('send_broadcast_notification', {
          p_title: title,
          p_body: message,
          p_type: type,
          p_target_role: role,
          p_link: link,
        });
      } catch {
        // RPC might not exist, continue anyway
      }

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

  async sendReminder(
    title: string,
    message: string,
    _icon?: string
  ) {
    return this.sendToAll(title, message, 'reminder', _icon);
  },

  async sendAnnouncement(
    title: string,
    message: string,
    _icon?: string
  ) {
    return this.sendToAll(title, message, 'announcement', _icon);
  },

  async sendUpdate(
    title: string,
    message: string,
    _icon?: string
  ) {
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
