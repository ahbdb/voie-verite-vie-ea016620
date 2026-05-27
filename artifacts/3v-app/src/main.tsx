// Initialize debug service FIRST before anything else
import './services/debug-service'
import { debugService } from './services/debug-service'

debugService.log('Application starting...', 'info', 'main');

// Enregistrer le service worker dès le démarrage (nécessaire pour l'installation PWA).
// Le fait AVANT le rendu React pour que le navigateur détecte l'app comme installable
// même pour les visiteurs non connectés.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/notification-sw.js', { scope: '/' }).catch(() => {
    // Silencieux — le SW sera enregistré plus tard si nécessaire
  });
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
