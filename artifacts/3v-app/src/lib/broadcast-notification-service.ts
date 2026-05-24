export type BroadcastNotificationType = 'greeting' | 'reminder' | 'announcement' | 'update';
export type BroadcastTargetRole = 'all' | 'user' | 'admin' | null;

import { supabase } from '@/integrations/supabase/client';

export interface BroadcastNotification {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  type: BroadcastNotificationType;
  target_role?: BroadcastTargetRole;
  created_by: string;
  scheduled_at?: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  user_id: string;
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
}

const SETTINGS_STORAGE_KEY = 'notification-settings';

const DEFAULT_SETTINGS = {
  push_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
} satisfies Omit<NotificationSettings, 'user_id'>;

const normalizeBroadcastType = (type?: string): BroadcastNotificationType => {
  if (type === 'greeting' || type === 'reminder' || type === 'announcement' || type === 'update') {
    return type;
  }
  return 'announcement';
};

const getStoredSettings = (userId: string): NotificationSettings => {
  if (typeof window === 'undefined') return { user_id: userId, ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(`${SETTINGS_STORAGE_KEY}:${userId}`);
    if (!raw) return { user_id: userId, ...DEFAULT_SETTINGS };
    return { user_id: userId, ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<NotificationSettings>) };
  } catch {
    return { user_id: userId, ...DEFAULT_SETTINGS };
  }
};

const saveStoredSettings = (settings: NotificationSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${SETTINGS_STORAGE_KEY}:${settings.user_id}`, JSON.stringify(settings));
};

export const getUserNotifications = async (limit = 50): Promise<UserNotification[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      user_id: row.user_id ?? '',
      title: row.title,
      message: row.message ?? '',
      type: row.type ?? 'announcement',
      link: row.link,
      is_read: row.is_read,
      created_at: row.created_at,
      updated_at: row.created_at,
    }));
  } catch {
    return [];
  }
};

export const getUnreadNotifications = async (): Promise<UserNotification[]> => {
  const all = await getUserNotifications();
  return all.filter((n) => !n.is_read);
};

export const getUnreadCount = async (): Promise<number> => {
  const unread = await getUnreadNotifications();
  return unread.length;
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    return !error;
  } catch {
    return false;
  }
};

export const markNotificationAsViewed = async (notificationId: string): Promise<boolean> => {
  return markNotificationAsRead(notificationId);
};

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId);
    return !error;
  } catch {
    return false;
  }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    return !error;
  } catch {
    return false;
  }
};

export const createBroadcastNotification = async (
  title: string,
  body: string,
  options: {
    icon?: string;
    type?: BroadcastNotificationType;
    target_role?: BroadcastTargetRole;
    scheduled_at?: string;
    link?: string | null;
  } = {}
): Promise<BroadcastNotification | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('broadcast_notifications')
      .insert({
        title,
        body,
        icon: options.icon,
        type: options.type ?? 'announcement',
        target_role: options.target_role ?? 'all',
        created_by: user.id,
        scheduled_at: options.scheduled_at || null,
        is_sent: false,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('createBroadcastNotification error:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body ?? undefined,
      icon: data.icon ?? undefined,
      type: normalizeBroadcastType(data.type ?? undefined),
      target_role: (data.target_role as BroadcastTargetRole) ?? 'all',
      created_by: data.created_by,
      scheduled_at: data.scheduled_at ?? undefined,
      sent_at: data.sent_at ?? undefined,
      is_sent: data.is_sent,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return null;
  }
};

export const sendBroadcastNotification = async (broadcastId: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: broadcast } = await supabase
      .from('broadcast_notifications')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (!broadcast) return false;

    // Fan-out: create user_notifications rows via stored procedure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('send_broadcast_notification', { p_broadcast_id: broadcastId });

    // Send Web Push from the browser using client-side VAPID signing
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (tokenRows && tokenRows.length > 0) {
      const tokens = tokenRows.map(r => r.token);
      const { sendWebPushToTokens } = await import('@/lib/web-push-client');
      const result = await sendWebPushToTokens(tokens, {
        title: broadcast.title,
        body: broadcast.body || '',
        icon: broadcast.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        url: '/',
        action: broadcast.type || 'announcement',
        tag: `broadcast-${broadcastId}`,
      });

      // Clean up expired subscriptions
      if (result.expired.length > 0) {
        await supabase.from('fcm_tokens').delete().in('token', result.expired);
      }

      console.log(`Push: ${result.sent} sent, ${result.failed} failed, ${result.expired.length} cleaned`);
    }

    return true;
  } catch (err) {
    console.error('sendBroadcastNotification error:', err);
    return false;
  }
};

export const getBroadcastNotifications = async (limit = 50): Promise<BroadcastNotification[]> => {
  try {
    const { data } = await supabase
      .from('broadcast_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body ?? undefined,
      type: normalizeBroadcastType(row.type ?? undefined),
      target_role: (row.target_role as BroadcastTargetRole) ?? 'all',
      created_by: row.created_by ?? '',
      is_sent: row.is_sent,
      sent_at: row.sent_at ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch {
    return [];
  }
};

export const subscribeToNotifications = (callback: (notification: UserNotification) => void) => {
  let active = true;

  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
      },
      (payload) => {
        if (active) {
          const n = payload.new as any;
          callback({
            id: n.id,
            user_id: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            link: n.link,
            is_read: n.is_read,
            created_at: n.created_at,
            updated_at: n.created_at,
          });
        }
      }
    )
    .subscribe();

  return () => {
    active = false;
    void channel.unsubscribe();
  };
};

export const subscribeToNotificationsChanges = (
  callback: (payload: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    notification: UserNotification;
  }) => void
) => {
  return subscribeToNotifications((n) => callback({ type: 'INSERT', notification: n }));
};

export const showSystemNotification = async (
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
  } = {}
) => {
  try {
    const settings = await getNotificationSettings();
    if (!settings.push_enabled) return;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.showNotification) {
        await registration.showNotification(title, {
          body: options.body ?? '',
          badge: options.badge ?? '/logo-3v.png',
          icon: options.icon ?? '/logo-3v.png',
          tag: options.tag ?? `notification-${Date.now()}`,
          silent: !settings.sound_enabled,
          requireInteraction: options.requireInteraction ?? false,
        });
        return;
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: options.body,
        badge: options.badge ?? '/logo-3v.png',
        icon: options.icon ?? '/logo-3v.png',
        tag: options.tag ?? `notification-${Date.now()}`,
      });
    }
  } catch {}
};

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user_id: '', ...DEFAULT_SETTINGS };
    return getStoredSettings(user.id);
  } catch {
    return { user_id: '', ...DEFAULT_SETTINGS };
  }
};

export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const nextSettings: NotificationSettings = { ...getStoredSettings(user.id), ...settings, user_id: user.id };
    saveStoredSettings(nextSettings);
    return true;
  } catch {
    return false;
  }
};
