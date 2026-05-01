import { supabase } from "@/integrations/supabase/client";
import { VAPID_KEY } from "./firebase-config";
import i18n from "@/i18n";

// Use the unified notification service worker to avoid having two SWs
// competing for the same scope '/', which causes a controllerchange event
// and triggers page reloads on mobile browsers.
const NOTIFICATION_SW_PATH = "/notification-sw.js";

/**
 * Register for push notifications using Web Push API with VAPID key.
 * The subscription is stored in the database and used by the backend
 * to send notifications via FCM.
 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return null;
    }

    // Use the unified notification service worker (not firebase-messaging-sw.js)
    // so we never have two service workers with scope '/' competing.
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(NOTIFICATION_SW_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
    } catch (err) {
      // Already registered — grab the existing one
      try {
        registration = await navigator.serviceWorker.ready;
      } catch {
        console.log("SW registration failed:", err);
        return null;
      }
    }

    // Request notification permission if not yet decided
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return null;
      }
    }

    if (Notification.permission !== "granted") {
      console.log("Notifications not permitted");
      return null;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push with VAPID key
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
      });
    }

    const token = JSON.stringify(subscription);

    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("User not logged in, skipping token save");
      return token;
    }

    const platform = detectPlatform();
    const lang = i18n.language?.substring(0, 2) || "fr";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";

    // Upsert token
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        platform,
        device_info: navigator.userAgent.substring(0, 200),
        language: lang,
        timezone,
      },
      { onConflict: "token" }
    );

    if (error) {
      console.error("Error saving FCM token:", error);
    } else {
      console.log("✓ Push notification token registered");
    }

    return token;
  } catch (err) {
    console.error("Push registration error:", err);
    return null;
  }
}

/**
 * Update the language preference for the current user's FCM tokens
 */
export async function updateFCMLanguage(lang: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("fcm_tokens")
      .update({ language: lang.substring(0, 2) })
      .eq("user_id", user.id);
  } catch (err) {
    console.error("Error updating FCM language:", err);
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
