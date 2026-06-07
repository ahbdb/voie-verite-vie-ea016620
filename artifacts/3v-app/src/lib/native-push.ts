// Native push (iOS/Android via Capacitor). No-op on web — web continues to use Web Push.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

export const isNative = () => Capacitor.isNativePlatform();

async function registerTokenWithBackend(token: string, platform: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('fcm_tokens').upsert(
      { user_id: user.id, token, platform } as any,
      { onConflict: 'token' } as any,
    );
  } catch (err) {
    console.warn('[native-push] token upsert failed', err);
  }
}

export async function initNativePush() {
  if (!isNative()) return;

  try {
    // 1. Permissions (push + local notifications)
    const pushPerm = await PushNotifications.checkPermissions();
    let granted = pushPerm.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    await LocalNotifications.requestPermissions();

    if (!granted) {
      console.warn('[native-push] push permission denied');
      return;
    }

    // 2. Register with APNs/FCM
    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('[native-push] token:', token.value);
      void registerTokenWithBackend(token.value, Capacitor.getPlatform());
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[native-push] registration error', err);
    });

    // 3. Foreground notification → show local notification with sound + vibrate
    PushNotifications.addListener('pushNotificationReceived', async (notif) => {
      const isCall = (notif.data?.action ?? notif.data?.type) === 'call';
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title: notif.title || '3V',
          body: notif.body || '',
          sound: isCall ? 'beep.wav' : undefined,
          extra: notif.data,
          ongoing: isCall,
          autoCancel: !isCall,
        }],
      });
    });

    // 4. Tap on notification → navigate
    const handleAction = (data: Record<string, unknown> | undefined) => {
      const url = (data?.url as string) || '/';
      if (typeof window !== 'undefined') window.location.href = url;
    };

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      handleAction(action.notification.data);
    });
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      handleAction(action.notification.extra);
    });

    // 5. App resume → re-check permissions silently
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) PushNotifications.getDeliveredNotifications().catch(() => {});
    });
  } catch (err) {
    console.error('[native-push] init failed', err);
  }
}