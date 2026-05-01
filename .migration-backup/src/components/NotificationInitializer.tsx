import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBroadcastNotifications } from '@/hooks/useBroadcastNotifications';
import { initNotificationClickHandler } from '@/lib/notification-service';
import { registerFCMToken } from '@/lib/fcm-registration';

export const NotificationInitializer = () => {
  const { user } = useAuth();

  useBroadcastNotifications();

  // Register push notifications when user is logged in
  useEffect(() => {
    if (!user?.id) return;

    // Register FCM token for push notifications
    registerFCMToken().catch((err) =>
      console.log('Push registration skipped:', err)
    );

    // Set up click handler for in-app notification routing
    initNotificationClickHandler();
  }, [user?.id]);

  return null;
};

export default NotificationInitializer;
