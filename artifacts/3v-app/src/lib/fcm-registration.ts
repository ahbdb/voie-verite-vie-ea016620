import { getToken } from 'firebase/messaging';
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseMessaging, FIREBASE_VAPID_KEY } from "./firebase-config";

export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return null;
    }

    // Request notification permission
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;

    // Register the Firebase Messaging service worker
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
    } catch {
      swReg = await navigator.serviceWorker.ready;
    }

    // Get Firebase Messaging instance
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.log("Firebase Messaging not supported on this browser");
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.log("No FCM token received");
      return null;
    }

    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return token;

    await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        platform: detectPlatform(),
        device_info: navigator.userAgent.substring(0, 200),
        language: navigator.language?.substring(0, 2) || "fr",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Douala",
      },
      { onConflict: "token" }
    );

    console.log("✓ FCM token registered");
    return token;
  } catch (err) {
    console.log("FCM registration error:", err);
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
    console.log("Error updating FCM language:", err);
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
