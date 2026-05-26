const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
  "BMLtv56mbtQef-qvdKPAvxl6AzUZQxCOGl1riyDSVzdL_RatZclqfYYNeSPybQFtYdbuNLuRDzAU1tY8caJTS_A";

function urlBase64ToUint8Array(b64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Register a Web Push subscription for this device and store it via the API.
 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Web Push not supported on this browser");
      return null;
    }

    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;

    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register("/notification-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
    } catch {
      swReg = await navigator.serviceWorker.ready;
    }

    // Check if the API already has a valid Web Push JSON token for this user
    let forceRefresh = false;
    try {
      const res = await fetch('/api/notifications/token', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (!data?.token) {
          forceRefresh = true;
        } else {
          try {
            const p = JSON.parse(data.token);
            if (!p?.endpoint || !p?.keys?.p256dh) forceRefresh = true;
          } catch { forceRefresh = true; }
        }
      } else {
        forceRefresh = true;
      }
    } catch {
      forceRefresh = true;
    }

    let subscription = await swReg.pushManager.getSubscription();
    if (!subscription || forceRefresh) {
      if (subscription && forceRefresh) await subscription.unsubscribe();
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = JSON.stringify(subscription.toJSON());

    await fetch('/api/notifications/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: subJson,
        platform: detectPlatform(),
        device_info: navigator.userAgent.substring(0, 200),
        language: navigator.language?.substring(0, 2) || "fr",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Douala",
      }),
    });

    console.log("✓ Web Push subscription registered");
    return subJson;
  } catch (err) {
    console.log("Push registration error:", err);
    return null;
  }
}

export async function updateFCMLanguage(lang: string) {
  try {
    await fetch('/api/notifications/token/language', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang.substring(0, 2) }),
    });
  } catch (err) {
    console.log("Error updating push language:", err);
  }
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Windows/.test(ua)) return "windows";
  if (/Mac/.test(ua)) return "macos";
  if (/Linux/.test(ua)) return "linux";
  return "web";
}
