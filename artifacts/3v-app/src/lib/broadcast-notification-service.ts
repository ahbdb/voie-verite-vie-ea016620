import { supabase } from '@/integrations/supabase/client';

export type BroadcastNotificationType = 'greeting' | 'reminder' | 'announcement' | 'update';
export type BroadcastTargetRole = 'all' | 'user' | 'admin' | null;

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
    const res = await fetch(`/api/notifications?limit=${limit}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      id: row.id,
      user_id: row.user_id ?? '',
      title: row.title,
      message: row.message ?? '',
      type: row.type ?? 'announcement',
      link: row.link,
      is_read: row.is_read,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
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
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const markNotificationAsViewed = async (notificationId: string): Promise<boolean> => {
  return markNotificationAsRead(notificationId);
};

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      credentials: 'include',
    });
    return res.ok;
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
    const res = await fetch('/api/notifications/broadcast', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message: body, type: options.type ?? 'announcement', link: options.link ?? null }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id ?? crypto.randomUUID(),
      title,
      body,
      type: options.type ?? 'announcement',
      target_role: options.target_role ?? 'all',
      created_by: '',
      is_sent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const sendBroadcastNotification = async (_broadcastId: string): Promise<boolean> => {
  // Broadcasts are now sent immediately via the API; this is a no-op shim.
  return true;
};

export const getBroadcastNotifications = async (_limit = 50): Promise<BroadcastNotification[]> => {
  // Not backed by API yet; return empty list gracefully.
  return [];
};

export const subscribeToNotifications = (_callback: (notification: UserNotification) => void) => {
  // Polling is handled by useBroadcastNotifications; return a no-op unsubscribe.
  return () => {};
};

export const subscribeToNotificationsChanges = (
  callback: (payload: { type: 'INSERT' | 'UPDATE' | 'DELETE'; notification: UserNotification }) => void
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
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return { user_id: '', ...DEFAULT_SETTINGS };
    return getStoredSettings(userId);
  } catch {
    return { user_id: '', ...DEFAULT_SETTINGS };
  }
};

export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return false;
    const nextSettings: NotificationSettings = { ...getStoredSettings(userId), ...settings, user_id: userId };
    saveStoredSettings(nextSettings);
    return true;
  } catch {
    return false;
  }
};
