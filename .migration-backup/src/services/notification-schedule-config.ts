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
  maxDailyFrequency?: number; // Max fois par jour (défaut 1)
  description: string;
}

/**
 * Calendrier quotidien des messages inspirants
 * Format: HH:MM (24h)
 */
export const dailyNotificationSchedule: ScheduledNotificationConfig[] = [
  {
    hour: 8,
    minute: 0,
    priority: 'high',
    description: '💖 Message d\'amour et d\'encouragement',
    messageFunction: async () => {
      // Sera importé dynamiquement pour éviter les dépendances circulaires
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
];

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
    times: ['06:00', '18:00'], // Matin et soir
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
  icon: '/logo-3v.png',
  badge: '/logo-3v.png',
  tag: 'voie-verite-vie',
  requireInteraction: true, // ✨ Important: reste visible jusquà action
  silent: false, // Notification sonore activée
  vibrate: [200, 100, 200], // Vibration en ms: vibrer 200ms, pause 100ms, vibrer 200ms
  renotify: true, // Pousser notif même si app au foreground
};

/**
 * Fréquence limite des notifications
 */
export const notificationLimits = {
  maxPerDay: 7, // Max 7 notifications par jour
  maxPerHour: 3, // Max 3 par heure
  minIntervalMinutes: 5, // Au minimum 5 min entre notifications
};

/**
 * Zones horaires supportées pour l'envoi personnalisé
 * (pour futur: permettre à chaque utilisateur d'avoir ses heures locales)
 */
export const supportedTimezones = [
  'Africa/Abidjan', // CET/CST - Côte d'Ivoire, Guinée, Mali, Burkina Faso
  'Africa/Accra', // GMT - Ghana, Togo, Bénin, Nigeria
  'Africa/Casablanca', // WET/WEST - Maroc, Mauritanie
  'Africa/Lagos', // WAT - Nigeria
  'Africa/Nairobi', // EAT - Afrique de l'Est
  'Africa/Cairo', // EET - Égypte
  'Africa/Johannesburg', // SAST - Afrique du Sud
  'Europe/London', // GMT/BST - UK
  'Europe/Paris', // CET/CEST - France
  'America/New_York', // EST/EDT - USA Est
  'America/Los_Angeles', // PST/PDT - USA Ouest
  'Asia/Dubai', // GST
  'Asia/Singapore', // SGT
  'Australia/Sydney', // AEDT/AEST
];
