/**
 * Configuration du calendrier des notifications automatiques
 * Messages envoyés chaque jour aux heures spécifiées
 */

export interface ScheduledNotificationConfig {
  hour: number;
  minute: number;
  timezone?: string;
  priority: 'high' | 'normal' | 'low';
  messageFunction: () => Promise<void>;
  maxDailyFrequency?: number;
  description: string;
}

/**
 * Calendrier quotidien des messages inspirants
 */
export const dailyNotificationSchedule: ScheduledNotificationConfig[] = [
  {
    hour: 6,
    minute: 30,
    priority: 'high',
    description: '✝️ Verset du matin',
    messageFunction: async () => {
      const { broadcastNotificationService } = await import('../hooks/useBroadcastNotifications');
      const verses = [
        'Que ce jour soit béni par la grâce de Dieu. "Je suis la voie, la vérité et la vie." — Jean 14:6',
        'Bonjour ! "Cherchez d\'abord le royaume de Dieu..." — Matthieu 6:33',
        '"Soyez dans la joie, priez sans cesse." — 1 Thessaloniciens 5:16-17',
      ];
      const v = verses[new Date().getDay() % verses.length];
      await broadcastNotificationService.sendToAll('✝️ Voie Vérité Vie', v, 'bible');
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 8,
    minute: 0,
    priority: 'high',
    description: '💖 Message d\'amour et d\'encouragement',
    messageFunction: async () => {
      const { sendLoveMessage } = await import('./motivational-notifications');
      await sendLoveMessage();
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 11,
    minute: 0,
    priority: 'high',
    description: '💪 Message de motivation "punch"',
    messageFunction: async () => {
      const { sendPunchMessage } = await import('./motivational-notifications');
      await sendPunchMessage();
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 12,
    minute: 30,
    priority: 'high',
    description: '🙏 Prière du midi',
    messageFunction: async () => {
      const { sendMidDayPrayer } = await import('./prayer-notifications');
      await sendMidDayPrayer();
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 15,
    minute: 0,
    priority: 'normal',
    description: '📱 Message de promotion de l\'application',
    messageFunction: async () => {
      const { sendPromotionMessage } = await import('./motivational-notifications');
      await sendPromotionMessage();
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 18,
    minute: 0,
    priority: 'normal',
    description: '📖 Rappel lecture biblique',
    messageFunction: async () => {
      const { broadcastNotificationService } = await import('../hooks/useBroadcastNotifications');
      await broadcastNotificationService.sendToAll(
        '📖 Lecture du jour',
        'Prenez quelques minutes pour lire la Parole de Dieu. La Bible vous attend !',
        'bible'
      );
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 20,
    minute: 0,
    priority: 'high',
    description: '🙏 Prière du soir',
    messageFunction: async () => {
      const { sendEveningPrayer } = await import('./prayer-notifications');
      await sendEveningPrayer();
    },
    maxDailyFrequency: 1,
  },
  {
    hour: 21,
    minute: 30,
    priority: 'normal',
    description: '🌙 Bonne nuit chrétienne',
    messageFunction: async () => {
      const { broadcastNotificationService } = await import('../hooks/useBroadcastNotifications');
      const msgs = [
        'Bonne nuit ! "En paix je me couche et je m\'endors, car toi seul, ô Éternel..." — Psaume 4:8',
        'Que le Seigneur veille sur vous cette nuit. Bonne nuit à tous ! 🌙🙏',
        'Remettez vos soucis à Dieu et reposez en paix. Bonne nuit ! 🌙',
      ];
      const m = msgs[new Date().getDay() % msgs.length];
      await broadcastNotificationService.sendToAll('🌙 Voie Vérité Vie', m, 'prayer');
    },
    maxDailyFrequency: 1,
  },
];

/**
 * Notifications de fêtes chrétiennes
 * À appeler depuis useFeastDayNotifier (hook dédié)
 */
export async function sendFeastNotification(feastName: string, feastMessage: string, feastIcon: string): Promise<void> {
  try {
    const { broadcastNotificationService } = await import('../hooks/useBroadcastNotifications');
    const title = `${feastIcon} ${feastName}`;
    await broadcastNotificationService.sendToAll(title, feastMessage, 'feast');

    // Also push via service worker if available
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        reg.showNotification(title, {
          body: feastMessage,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: `feast-${Date.now()}`,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200, 100, 200],
          data: { action: 'feast', url: '/' },
          actions: [
            { action: 'open', title: '🙏 Voir la célébration' },
            { action: 'dismiss', title: 'Fermer' },
          ],
        } as any);
      }
    }
  } catch (e) {
    console.warn('[FeastNotification] Failed to send:', e);
  }
}

/**
 * Messages spéciaux - triggered par événements
 */
export const specialNotificationSchedule = {
  appOpen: {
    description: '👋 Notification de bienvenue à l\'ouverture',
    messageFunction: async () => {
      const hours = new Date().getHours();
      const greeting = hours < 12
        ? '☀️ Bonjour! Que Dieu bénisse votre jour.'
        : hours < 18
        ? '🌤️ Bon après-midi! Continuez à prier.'
        : '🌙 Bonsoir! Prenez du temps pour prier.';
      const { broadcastNotificationService } = await import('../hooks/useBroadcastNotifications');
      await broadcastNotificationService.sendToAll('👋 Bienvenue', greeting, 'greeting');
    },
  },

  birthday: {
    description: '🎂 Message d\'anniversaire',
    messageFunction: async () => {
      const { sendBirthdayMessage } = await import('./motivational-notifications');
      await sendBirthdayMessage();
    },
  },

  weeklyDailyReading: {
    description: '📖 Rappel de lecture biblique quotidienne',
    times: ['06:30', '18:00'],
  },

  monthlyRespiritual: {
    description: '✨ Message de respritualisation mensuel',
    dayOfMonth: 1,
    hour: 10,
  },
};

/**
 * Options de notification Web Push
 */
export const webPushOptions = {
  icon: '/icon-192x192.png',
  badge: '/badge-72x72.png',
  tag: 'voie-verite-vie',
  requireInteraction: true,
  silent: false,
  vibrate: [200, 100, 200],
  renotify: true,
};

/**
 * Fréquence limite des notifications
 */
export const notificationLimits = {
  maxPerDay: 10,
  maxPerHour: 3,
  minIntervalMinutes: 5,
};

/**
 * Zones horaires supportées
 */
export const supportedTimezones = [
  'Africa/Abidjan',
  'Africa/Accra',
  'Africa/Casablanca',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];
