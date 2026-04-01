import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBroadcastNotifications } from '@/hooks/useBroadcastNotifications';
import {
  initNotificationClickHandler,
  registerNotificationServiceWorker,
} from '@/lib/notification-service';
import { registerFCMToken } from '@/lib/fcm-registration';

export const NotificationInitializer = () => {
  const { user } = useAuth();

  useBroadcastNotifications();

  useEffect(() => {
    void initNotificationPermissions();
    initNotificationClickHandler();
  }, [user?.id]);

  // Register FCM token when user is logged in
  useEffect(() => {
    if (user?.id) {
      registerFCMToken().catch((err) =>
        console.log('FCM registration skipped:', err)
      );
    }
  }, [user?.id]);

  return null;
};

async function initNotificationPermissions() {
  try {
    await registerNotificationServiceWorker();

    if (!('Notification' in window)) {
      console.log('Les notifications ne sont pas supportées sur ce navigateur');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✓ Permissions de notification accordées');
        } else if (permission === 'denied') {
          console.log("Notifications bloquées par l'utilisateur");
        }
      } catch (error) {
        console.log('Impossible de demander la permission de notification:', error);
      }
    }
  } catch (error) {
    console.log("Erreur lors de l'initialisation des notifications:", error);
  }
}

export default NotificationInitializer;
