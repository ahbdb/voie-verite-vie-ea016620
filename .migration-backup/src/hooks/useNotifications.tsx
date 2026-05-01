import { useEffect, useCallback } from 'react';
import {
  initNotificationsAutomatically,
  sendNotification,
  initNotificationClickHandler,
  sendBibleNotification,
  sendCaremeReminder,
  sendCheminDeCroixReminder,
  sendActivityNotification,
  sendGalleryNotification,
  sendUpdateNotification,
} from '@/lib/notification-service';

/**
 * Hook pour initialiser et gérer les notifications automatiques
 * Sans demander de permission - tout est transparent pour l'utilisateur
 */
export const useNotifications = () => {
  // Initialiser les notifications automatiquement au montage
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Initialiser sans demander
        await initNotificationsAutomatically();

        // Initialiser le gestionnaire de clics
        initNotificationClickHandler();
      } catch (err) {
        console.log('Notifications non disponibles (normal):', err);
      }
    };

    initNotifications();
  }, []);

  // Fonction générique pour envoyer une notification
  const notify = useCallback(
    async (title: string, options: any = {}) => {
      await sendNotification({
        title,
        ...options,
      });
    },
    []
  );

  // Notifications spécifiques préconçues
  const notifyBible = useCallback(
    (title: string, chapter: string) => sendBibleNotification(title, chapter),
    []
  );

  const notifyCareme = useCallback(
    (day: number, title: string) => sendCaremeReminder(day, title),
    []
  );

  const notifyCheminDeCroix = useCallback(
    (station: number, title: string) => sendCheminDeCroixReminder(station, title),
    []
  );

  const notifyActivity = useCallback(
    (name: string, description: string) => sendActivityNotification(name, description),
    []
  );

  const notifyGallery = useCallback(
    (title: string, description: string) => sendGalleryNotification(title, description),
    []
  );

  const notifyUpdate = useCallback(
    (title: string, description: string, type?: string) => 
      sendUpdateNotification(title, description, type),
    []
  );

  return {
    notify,
    notifyBible,
    notifyCareme,
    notifyCheminDeCroix,
    notifyActivity,
    notifyGallery,
    notifyUpdate,
  };
};
