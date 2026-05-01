/// <reference types="vite/client" />

interface Window {
  __pwaUpdateSW?: (reloadPage?: boolean) => Promise<void>;
  __pwaUpdateAvailable?: boolean;
  __pwaUpdateListeners?: Set<() => void>;
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: unknown) => void;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }

  /**
   * Registers the PWA service worker.
   * Returns a function you can call to trigger an update (when supported).
   */
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
