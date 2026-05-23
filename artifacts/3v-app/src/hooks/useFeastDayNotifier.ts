import { useEffect } from 'react';
import { loadFeasts, checkFeastToday } from '@/lib/christian-feasts';
import { sendFeastNotification } from '@/services/notification-schedule-config';

const STORAGE_KEY_PREFIX = '3v-feast-notified-';

function alreadyNotifiedToday(feastId: string): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${feastId}`) === today;
  } catch {
    return false;
  }
}

function markNotifiedToday(feastId: string): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${feastId}`, today);
  } catch {}
}

export function useFeastDayNotifier(): void {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const feasts = loadFeasts();
        const feast = checkFeastToday(feasts);
        if (!feast) return;
        if (alreadyNotifiedToday(feast.id)) return;

        markNotifiedToday(feast.id);

        await sendFeastNotification(feast.name, feast.message, feast.icon);
      } catch (e) {
        console.warn('[FeastDayNotifier] Error:', e);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);
}
