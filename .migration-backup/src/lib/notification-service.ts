/**
 * Service de notifications intelligentes
 * Gère les notifications visibles, silencieuses et les appels entrants.
 */

export interface NotificationPayload {
  title: string;
  body?: string;
  badge?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
  action?: 'careme' | 'chemin-croix' | 'activity' | 'bible' | 'gallery' | 'reminder' | 'call';
  silent?: boolean;
  badge_count?: number;
  requireInteraction?: boolean;
  vibrate?: number[];
  renotify?: boolean;
}

const NOTIFICATION_SW_PATH = '/notification-sw.js';

export const registerNotificationServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(NOTIFICATION_SW_PATH, { scope: '/' });
  } catch (error) {
    console.log('Service Worker déjà enregistré ou indisponible:', error);
    return navigator.serviceWorker.ready;
  }
};

const buildNotificationOptions = (payload: NotificationPayload) => ({
  body: payload.body || '',
  badge: payload.badge || '/logo-3v.png',
  icon: payload.icon || '/logo-3v.png',
  tag: payload.tag || 'default',
  silent: payload.silent ?? true,
  renotify: payload.renotify ?? payload.action === 'call',
  vibrate: payload.vibrate || (payload.action === 'call' ? [250, 150, 250, 150, 350] : [120, 60, 120]),
  requireInteraction: payload.requireInteraction ?? payload.action === 'call',
  data: {
    ...payload.data,
    action: payload.action,
    url: payload.data?.url,
    timestamp: new Date().toISOString(),
  },
});

export const playAttentionTone = async () => {
  try {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const scheduleBeep = (delay: number, duration: number, frequency: number) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.0001;

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const startAt = context.currentTime + delay;
      oscillator.start(startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.stop(startAt + duration + 0.02);
    };

    scheduleBeep(0, 0.24, 720);
    scheduleBeep(0.32, 0.24, 860);
    scheduleBeep(0.64, 0.32, 720);
  } catch (error) {
    console.log('Sonnerie non disponible:', error);
  }
};

export const sendSilentNotification = async (payload: NotificationPayload) => {
  try {
    const registration = await registerNotificationServiceWorker();

    if (registration?.showNotification && 'Notification' in window && Notification.permission === 'granted') {
      await registration.showNotification(payload.title, buildNotificationOptions(payload));
      return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, buildNotificationOptions(payload));
    }
  } catch (err) {
    console.log('Notification non supportée:', err);
  }
};

export const sendVisibleNotification = async (payload: NotificationPayload) => {
  try {
    const registration = await registerNotificationServiceWorker();

    if (registration?.showNotification && 'Notification' in window && Notification.permission === 'granted') {
      await registration.showNotification(
        payload.title,
        buildNotificationOptions({
          ...payload,
          silent: false,
          renotify: payload.renotify ?? true,
          requireInteraction: payload.requireInteraction ?? true,
          tag: payload.tag || `visible-${Date.now()}`,
        })
      );
      return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        payload.title,
        buildNotificationOptions({
          ...payload,
          silent: false,
          renotify: payload.renotify ?? true,
          requireInteraction: payload.requireInteraction ?? true,
          tag: payload.tag || `visible-${Date.now()}`,
        })
      );
    }
  } catch (err) {
    console.log('Notification visible non supportée:', err);
  }
};

export const sendNotification = async (payload: NotificationPayload) => {
  if (payload.silent === false || payload.action === 'call') {
    await sendVisibleNotification(payload);
    return;
  }

  await sendSilentNotification(payload);
};

export const initNotificationsAutomatically = async () => {
  try {
    await registerNotificationServiceWorker();

    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.log('Permission de notification non disponible:', err);
      }
    }
  } catch (err) {
    console.log('Initialisation des notifications échouée:', err);
  }
};

export const sendBibleNotification = async (title: string, chapter: string) => {
  await sendVisibleNotification({
    title: `📖 Nouvelle lecture: ${title}`,
    body: `Chapitre ${chapter} disponible`,
    tag: `bible-${title}-${Date.now()}`,
    data: {
      action: 'bible',
      title,
      chapter,
      url: '/biblical-reading',
    },
    action: 'bible',
    silent: false,
  });
};

export const sendCaremeReminder = async (day: number, title: string) => {
  await sendVisibleNotification({
    title: `🙏 Carême Jour ${day}`,
    body: title,
    tag: `careme-${day}-${Date.now()}`,
    data: {
      action: 'careme',
      day,
      url: '/careme-2026',
    },
    action: 'careme',
    silent: false,
  });
};

export const sendCheminDeCroixReminder = async (station: number, title: string) => {
  await sendVisibleNotification({
    title: `✝️ Station ${station}: ${title}`,
    body: 'Méditation disponible',
    tag: `chemin-croix-${station}-${Date.now()}`,
    data: {
      action: 'chemin-croix',
      station,
      url: '/chemin-de-croix',
    },
    action: 'chemin-croix',
    silent: false,
  });
};

export const sendActivityNotification = async (activityName: string, description: string) => {
  await sendVisibleNotification({
    title: `🎯 ${activityName}`,
    body: description,
    tag: `activity-${activityName}-${Date.now()}`,
    data: {
      action: 'activity',
      name: activityName,
      url: '/activities',
    },
    action: 'activity',
    silent: false,
  });
};

export const sendGalleryNotification = async (title: string, description: string) => {
  await sendVisibleNotification({
    title: `🖼️ ${title}`,
    body: description,
    tag: `gallery-${title}-${Date.now()}`,
    data: {
      action: 'gallery',
      title,
      url: '/gallery',
    },
    action: 'gallery',
    silent: false,
  });
};

export const sendUpdateNotification = async (title: string, description: string, type: string = 'update') => {
  await sendVisibleNotification({
    title: `✨ ${title}`,
    body: description,
    tag: `update-${Date.now()}`,
    data: {
      action: 'reminder',
      type,
      url: '/',
    },
    action: 'reminder',
    silent: false,
  });
};

export const initNotificationClickHandler = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if ((window as any).__notificationClickHandlerInitialized) {
    return;
  }

  (window as any).__notificationClickHandlerInitialized = true;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
      const { action, data } = event.data.payload;
      const explicitUrl = data?.url;

      if (explicitUrl) {
        window.location.href = explicitUrl;
        return;
      }

      switch (action) {
        case 'careme':
          window.location.href = '/careme-2026';
          break;
        case 'chemin-croix':
          window.location.href = '/chemin-de-croix';
          break;
        case 'bible':
          window.location.href = '/biblical-reading';
          break;
        case 'activity':
          window.location.href = '/activities';
          break;
        case 'gallery':
          window.location.href = '/gallery';
          break;
        case 'call':
          window.location.href = '/';
          break;
        default:
          window.location.href = '/';
      }
    }
  });
};
