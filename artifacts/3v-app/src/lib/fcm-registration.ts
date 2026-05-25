import { supabase } from "@/integrations/supabase/client";

// VAPID public key — must match the send-push-notification Edge Function.
// This is a public value; it is safe to embed here.
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
  "BDZP1G3CVzMfjpDGH7MGktPHySL1O1ZqqpP6B5QSgp09f8xu3lN9BLnQ527CZNXIY9q6KoISzbKbmbIAS8_I0AU";

function urlBase64ToUint8Array(b64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  // Explicit ArrayBuffer so TS infers Uint8Array<ArrayBuffer> not Uint8Array<ArrayBufferLike>
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Register a Web Push subscription for this device and store it in Supabase.
 * The stored JSON matches what send-push-notification Edge Function expects:
 *   { endpoint: string, keys: { p256dh: string, auth: string } }
 *
 * Works on: Android Chrome/Samsung, Firefox, iOS 16.4+ (home-screen PWA).
 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Web Push not supported on this browser");
      return null;
    }

    // Ask permission
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;

    // Register notification-sw.js — this is the SW that handles push events
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register("/notification-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
    } catch {
      swReg = await navigator.serviceWorker.ready;
    }

    // Get existing subscription or create a new one
    let subscription = await swReg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Serialise to JSON — this is what the Edge Function parses
    const subJson = JSON.stringify(subscription.toJSON());

    // Persist in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return subJson;

    await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token: subJson,
        platform: detectPlatform(),
        device_info: navigator.userAgent.substring(0, 200),
        language: navigator.language?.substring(0, 2) || "fr",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Douala",
      },
      { onConflict: "token" }
    );

    console.log("✓ Web Push subscription registered");
    return subJson;
  } catch (err) {
    console.log("Push registration error:", err);
    return null;
  }
}

export async function updateFCMLanguage(lang: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("fcm_tokens")
      .update({ language: lang.substring(0, 2) })
      .eq("user_id", user.id);
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
