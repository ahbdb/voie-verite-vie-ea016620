import { useEffect, useRef } from 'react';

/**
 * Acquires a Screen Wake Lock while the call is active so the device
 * screen never turns off mid-call (like WhatsApp).
 * Falls back silently on browsers that don't support the API.
 */
export function useCallWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      return;
    }

    if (!('wakeLock' in navigator)) return;

    let released = false;

    const acquire = async () => {
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen') as WakeLockSentinel;
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (!released) {
            sentinelRef.current = null;
            // Re-acquire when released by the system (e.g. tab became hidden then visible)
            acquire();
          }
        });
      } catch {
        // Silently ignore — permission denied or not supported
      }
    };

    // Re-acquire when the page becomes visible again (required by the spec)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active && !sentinelRef.current) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void acquire();

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
