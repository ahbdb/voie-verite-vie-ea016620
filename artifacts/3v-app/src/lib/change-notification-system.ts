/**
 * Système de notifications pour les nouveautés et changements
 * Version migrée — polling API au lieu de Supabase Realtime
 */

import {
  sendCaremeReminder,
  sendCheminDeCroixReminder,
  sendUpdateNotification,
  sendVisibleNotification,
} from './notification-service';

export const initChangeNotificationSystem = async (_userId?: string): Promise<() => void> => {
  return () => {};
};

export const sendDailyWelcomeNotification = async (userId?: string) => {
  try {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `welcome-notification-sent-${userId}-${today}`;

    if (localStorage.getItem(storageKey)) return;

    const hour = new Date().getHours();
    let welcomeMessage = '';
    let timeEmoji = '';

    if (hour < 12) {
      timeEmoji = '🌅';
      welcomeMessage = `Bonjour! Bienvenue dans notre communauté!`;
    } else if (hour < 18) {
      timeEmoji = '☀️';
      welcomeMessage = `Bienvenue! Bonne journée!`;
    } else {
      timeEmoji = '🌙';
      welcomeMessage = `Bonsoir! Bienvenue!`;
    }

    await sendVisibleNotification({
      title: `${timeEmoji} Bienvenue!`,
      body: welcomeMessage,
      tag: `welcome-${today}`,
      badge: '/logo-3v.png',
      icon: '/logo-3v.png',
      data: { action: 'welcome', timestamp: new Date().toISOString(), hour },
      action: 'reminder',
      silent: false,
    });

    localStorage.setItem(storageKey, 'true');
  } catch {}
};

export const sendWelcomeNotification = async () => {
  await sendUpdateNotification('👋 Bienvenue!', 'Accédez au Carême, Chemin de Croix, lectures bibliques et plus');
};

export const sendActivityReminderNotification = async () => {
  const messages = [
    { title: '📖 Lecture biblique', body: "Découvrez les écritures saintes d'aujourd'hui" },
    { title: '🙏 Carême 2026', body: 'Votre méditation du jour vous attend' },
    { title: '✝️ Chemin de Croix', body: 'Méditez sur les stations du chemin' },
    { title: '🎯 Activités', body: 'Participez aux événements de notre communauté' },
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  await sendUpdateNotification(randomMessage.title, randomMessage.body);
};
