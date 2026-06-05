// Initialize debug service FIRST before anything else
import './services/debug-service'
import { debugService } from './services/debug-service'

debugService.log('Application starting...', 'info', 'main');

// Enregistrer le service worker + gérer les mises à jour PWA proprement.
if ('serviceWorker' in navigator) {
  // Globals attendus par PWAUpdatePrompt
  window.__pwaUpdateAvailable = false;
  window.__pwaUpdateListeners = new Set();

  const notifyUpdate = () => {
    (window as any).__pwaUpdateAvailable = true;
    (window as any).__pwaUpdateListeners?.forEach((fn: () => void) => fn());
  };

  // Rechargement automatique quand le nouveau SW prend le contrôle
  // (skipWaiting() dans le SW → controllerchange → reload)
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload(); }
  });

  navigator.serviceWorker.register('/notification-sw.js', { scope: '/' })
    .then(reg => {
      // Vérifier une mise à jour immédiatement au démarrage
      reg.update().catch(() => {});

      // Écouter les nouveaux SW en cours d'installation
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          // Nouveau SW installé ET un ancien SW contrôlait déjà la page
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate();
          }
        });
      });

      // Exposer la fonction de mise à jour manuelle pour PWAUpdatePrompt
      (window as any).__pwaUpdateSW = async (reloadPage = false) => {
        const waiting = reg.waiting;
        if (waiting) {
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (reloadPage) window.location.reload();
      };
    })
    .catch(() => {});
}

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

debugService.log('React dependencies loaded', 'info', 'main');

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error('Root element not found');
  }
  debugService.log('Root element found, creating React app', 'info', 'main');
  createRoot(root).render(<App />);
  debugService.log('React app rendered successfully', 'info', 'main');
} catch (error) {
  debugService.logError(error, 'main-render');
}
