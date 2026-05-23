import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { logger } from '@/lib/logger'

// Expose SW update callback globally so React component can trigger reload
declare global {
  interface Window {
    __pwaUpdateSW?: (reloadPage?: boolean) => Promise<void>;
    __pwaUpdateAvailable?: boolean;
    __pwaUpdateListeners?: Set<() => void>;
  }
}

window.__pwaUpdateListeners = new Set();

if (import.meta.env.PROD) {
  const registerPWA = async () => {
    try {
      const { registerSW } = await (Function('return import("virtual:pwa-register")')() as Promise<any>);
      const updateSW = registerSW({
        onNeedRefresh() {
          logger.info('Nouvelle version disponible');
          window.__pwaUpdateAvailable = true;
          window.__pwaUpdateSW = updateSW;
          // Notify all listeners
          window.__pwaUpdateListeners?.forEach((fn) => fn());
        },
        onOfflineReady() {
          logger.info('App prête pour utilisation hors-ligne');
        },
        onRegisteredSW(swUrl: string, registration?: ServiceWorkerRegistration) {
          logger.info('Service Worker enregistré', { swUrl });

          const checkForUpdates = async () => {
            try {
              await registration?.update();
            } catch {
              // silent: we'll retry on next trigger
            }
          };

          // If an update is already waiting at startup, show prompt immediately
          if (registration?.waiting) {
            window.__pwaUpdateAvailable = true;
            window.__pwaUpdateSW = updateSW;
            window.__pwaUpdateListeners?.forEach((fn) => fn());
          }

          // Check for updates periodically + when app regains connectivity/focus
          setInterval(checkForUpdates, 30 * 60 * 1000);
          window.addEventListener('online', checkForUpdates);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForUpdates();
          });

          // Initial update check after registration
          checkForUpdates();
        },
        onRegisterError(error: Error) {
          logger.error("Erreur d'enregistrement du SW", {}, error instanceof Error ? error : new Error(String(error)));
        },
      });

      window.__pwaUpdateSW = updateSW;
    } catch (error) {
      logger.warn('PWA non disponible');
    }
  };
  registerPWA();
}

createRoot(document.getElementById("root")!).render(<App />);
