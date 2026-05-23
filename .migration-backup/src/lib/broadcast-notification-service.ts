import type { Tables } from '@/integrations/supabase/types';
import { supabase } from './supabase';

export type BroadcastNotificationType = 'greeting' | 'reminder' | 'announcement' | 'update';
export type BroadcastTargetRole = 'all' | 'user' | 'admin' | null;

type NotificationRow = Tables<'notifications'>;

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

type DraftBroadcastNotification = BroadcastNotification & {
  link?: string | null;
};

const SETTINGS_STORAGE_KEY = 'notification-settings';
const draftBroadcasts = new Map<string, DraftBroadcastNotification>();

const DEFAULT_SETTINGS = {
  push_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
} satisfies Omit<NotificationSettings, 'user_id'>;

const mapNotificationRow = (row: NotificationRow): UserNotification => ({
  id: row.id,
  user_id: row.user_id ?? '',
  title: row.title,
  message: row.message,
  type: row.type,
  link: row.link,
  is_read: row.is_read,
  created_at: row.created_at,
  updated_at: row.created_at,
});

const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

const normalizeBroadcastType = (type?: string): BroadcastNotificationType => {
  if (type === 'greeting' || type === 'reminder' || type === 'announcement' || type === 'update') {
    return type;
  }

  return 'announcement';
};

const getStoredSettings = (userId: string): NotificationSettings => {
  if (typeof window === 'undefined') {
    return { user_id: userId, ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(`${SETTINGS_STORAGE_KEY}:${userId}`);
    if (!raw) {
      return { user_id: userId, ...DEFAULT_SETTINGS };
    }

    return {
      user_id: userId,
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(raw) as Partial<NotificationSettings>),
    };
  } catch {
    return { user_id: userId, ...DEFAULT_SETTINGS };
  }
};

const saveStoredSettings = (settings: NotificationSettings) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    `${SETTINGS_STORAGE_KEY}:${settings.user_id}`,
    JSON.stringify(settings)
  );
};

const resolveRecipientIds = async (targetRole: BroadcastTargetRole): Promise<string[]> => {
  if (targetRole === 'admin') {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'admin_principal']);

    if (error) throw error;

    return [...new Set((data ?? []).map((row) => row.user_id))];
  }

  if (targetRole === 'user') {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'user');

    if (error) throw error;

    return [...new Set((data ?? []).map((row) => row.user_id))];
  }

  const { data, error } = await supabase.from('profiles').select('id');

  if (error) throw error;

  return (data ?? []).map((profile) => profile.id);
};

const insertNotifications = async (
  recipientIds: string[],
  broadcast: DraftBroadcastNotification
): Promise<boolean> => {
  if (recipientIds.length === 0) {
    return true;
  }

  const payload = recipientIds.map((userId) => ({
    user_id: userId,
    title: broadcast.title,
    message: broadcast.body ?? '',
    type: broadcast.type,
    link: broadcast.link ?? null,
    is_read: false,
  }));

  const { error } = await supabase.from('notifications').insert(payload);

  if (error) throw error;

  return true;
};

const sendDraftBroadcast = async (broadcast: DraftBroadcastNotification): Promise<boolean> => {
  const recipientIds = await resolveRecipientIds(broadcast.target_role ?? 'all');
  await insertNotifications(recipientIds, broadcast);

  const sentAt = new Date().toISOString();
  draftBroadcasts.set(broadcast.id, {
    ...broadcast,
    is_sent: true,
    sent_at: sentAt,
    updated_at: sentAt,
  });

  await showSystemNotification('Notification envoyée', {
    body: 'La notification a été envoyée aux destinataires sélectionnés.',
    tag: `broadcast-sent-${broadcast.id}`,
    requireInteraction: false,
  });

  return true;
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
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const broadcast: DraftBroadcastNotification = {
      id: crypto.randomUUID(),
      title,
      body,
      icon: options.icon,
      type: options.type ?? 'announcement',
      target_role: options.target_role ?? 'all',
      created_by: user.id,
      scheduled_at: options.scheduled_at,
      is_sent: false,
      created_at: now,
      updated_at: now,
      link: options.link ?? null,
    };

    draftBroadcasts.set(broadcast.id, broadcast);
    return broadcast;
  } catch (err) {
    console.error('Error creating broadcast notification:', err);
    return null;
  }
};

export const sendBroadcastNotification = async (broadcastId: string): Promise<boolean> => {
  try {
    const draft = draftBroadcasts.get(broadcastId);
    if (!draft) {
      throw new Error('Notification introuvable');
    }

    return await sendDraftBroadcast(draft);
  } catch (err) {
    console.error('Error sending broadcast notification:', err);
    return false;
  }
};

export const getUserNotifications = async (limit = 50): Promise<UserNotification[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map(mapNotificationRow);
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    return [];
  }
};

export const getUnreadNotifications = async (): Promise<UserNotification[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapNotificationRow);
  } catch (err) {
    console.error('Error fetching unread notifications:', err);
    return [];
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return count ?? 0;
  } catch (err) {
    console.error('Error getting unread count:', err);
    return 0;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
};

export const markNotificationAsViewed = async (notificationId: string): Promise<boolean> => {
  return markNotificationAsRead(notificationId);
};

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error deleting notification:', err);
    return false;
  }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
  }
};

export const subscribeToNotifications = (callback: (notification: UserNotification) => void) => {
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  void getCurrentUser().then((user) => {
    if (!active || !user) return;

    channel = supabase
      .channel(`notifications:${user.id}:insert`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(mapNotificationRow(payload.new as NotificationRow));
        }
      )
      .subscribe();
  });

  return () => {
    active = false;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};

export const subscribeToNotificationsChanges = (
  callback: (payload: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    notification: UserNotification;
  }) => void
) => {
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  void getCurrentUser().then((user) => {
    if (!active || !user) return;

    channel = supabase
      .channel(`notifications:${user.id}:all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const source = (payload.eventType === 'DELETE' ? payload.old : payload.new) as NotificationRow;
          callback({
            type: payload.eventType,
            notification: mapNotificationRow(source),
          });
        }
      )
      .subscribe();
  });

  return () => {
    active = false;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
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
  } catch (err) {
    console.log('System notification not available:', err);
  }
};

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { user_id: '', ...DEFAULT_SETTINGS };
    }

    return getStoredSettings(user.id);
  } catch (err) {
    console.error('Error getting notification settings:', err);
    return { user_id: '', ...DEFAULT_SETTINGS };
  }
};

export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const nextSettings: NotificationSettings = {
      ...getStoredSettings(user.id),
      ...settings,
      user_id: user.id,
    };

    saveStoredSettings(nextSettings);
    return true;
  } catch (err) {
    console.error('Error updating notification settings:', err);
    return false;
  }
};

export const getBroadcastNotifications = async (limit = 50): Promise<BroadcastNotification[]> => {
  try {
    const draftHistory = [...draftBroadcasts.values()]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,message,type,created_at,user_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const persistedHistory: BroadcastNotification[] = (data ?? []).map((row) => ({
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

    const combined = [...draftHistory, ...persistedHistory];
    const unique = combined.filter(
      (notification, index, array) =>
        array.findIndex((candidate) => candidate.id === notification.id) === index
    );

    return unique.slice(0, limit);
  } catch (err) {
    console.error('Error fetching broadcast notifications:', err);
    return [...draftBroadcasts.values()].slice(0, limit);
  }
};
