import { supabase } from "@/integrations/supabase/client";
import { VAPID_KEY } from "./firebase-config";
import i18n from "@/i18n";

const FCM_SW_PATH = "/firebase-messaging-sw.js";

/**
 * Register or update the FCM token for push notifications
 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return null;
    }

    // Register our custom service worker for FCM
    const registration = await navigator.serviceWorker.register(FCM_SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;

    // Request notification permission
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return null;
      }
    }

    if (Notification.permission !== "granted") {
      return null;
    }

    // Subscribe to push with VAPID key
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });

    const token = JSON.stringify(subscription);

    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("User not logged in, skipping FCM token save");
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
      console.log("✓ FCM token registered successfully");
    }

    return token;
  } catch (err) {
    console.error("FCM registration error:", err);
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
