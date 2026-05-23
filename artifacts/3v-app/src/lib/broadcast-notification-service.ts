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
    const res = await fetch(`/api/notifications?limit=${limit}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id ?? '',
      title: row.title,
      message: row.message,
      type: row.type,
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
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title,
      body,
      icon: options.icon,
      type: options.type ?? 'announcement',
      target_role: options.target_role ?? 'all',
      created_by: '',
      scheduled_at: options.scheduled_at,
      is_sent: false,
      created_at: now,
      updated_at: now,
    };
  } catch {
    return null;
  }
};

export const sendBroadcastNotification = async (broadcastId: string): Promise<boolean> => {
  return false;
};

export const getBroadcastNotifications = async (limit = 50): Promise<BroadcastNotification[]> => {
  try {
    const res = await fetch(`/api/notifications?limit=${limit}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.message,
      type: normalizeBroadcastType(row.type),
      target_role: null,
      created_by: row.user_id ?? '',
      is_sent: true,
      sent_at: row.created_at,
      created_at: row.created_at,
      updated_at: row.created_at,
    }));
  } catch {
    return [];
  }
};

export const subscribeToNotifications = (callback: (notification: UserNotification) => void) => {
  let active = true;
  let lastId: string | null = null;

  const poll = async () => {
    if (!active) return;
    try {
      const notifications = await getUserNotifications(5);
      if (notifications.length > 0) {
        const newest = notifications[0];
        if (lastId === null) {
          lastId = newest.id;
        } else if (newest.id !== lastId) {
          lastId = newest.id;
          callback(newest);
        }
      }
    } catch {}
  };

  const interval = setInterval(() => void poll(), 15000);
  void poll();

  return () => {
    active = false;
    clearInterval(interval);
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
    const res = await fetch('/api/auth/user', { credentials: 'include' });
    if (!res.ok) return { user_id: '', ...DEFAULT_SETTINGS };
    const data = await res.json();
    const userId = data.user?.id ?? '';
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
    const res = await fetch('/api/auth/user', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    const userId = data.user?.id;
    if (!userId) return false;
    const nextSettings: NotificationSettings = { ...getStoredSettings(userId), ...settings, user_id: userId };
    saveStoredSettings(nextSettings);
    return true;
  } catch {
    return false;
  }
};
