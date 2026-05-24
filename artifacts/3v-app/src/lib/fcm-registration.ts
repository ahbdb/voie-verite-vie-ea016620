import { supabase } from "@/integrations/supabase/client";
import { VAPID_KEY, VAPID_KEY_VERSION } from "./firebase-config";

const NOTIFICATION_SW_PATH = "/notification-sw.js";
const VAPID_VERSION_KEY = "vapid_version";

export async function registerFCMToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return null;
    }

    if (!VAPID_KEY) {
      console.log("VAPID_KEY not configured");
      return null;
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(NOTIFICATION_SW_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
    } catch {
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.log("SW registration failed:", err);
        return null;
      }
    }

    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;

    // Force re-subscribe when VAPID key rotates
    const storedVersion = localStorage.getItem(VAPID_VERSION_KEY);
    if (storedVersion !== VAPID_KEY_VERSION) {
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => {});
      localStorage.setItem(VAPID_VERSION_KEY, VAPID_KEY_VERSION);
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
    }

    const token = JSON.stringify(subscription);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return token;

    const platform = detectPlatform();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";

    await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        platform,
        device_info: navigator.userAgent.substring(0, 200),
        language: "fr",
        timezone,
      },
      { onConflict: "token" }
    );

    console.log("✓ Push subscription registered");
    return token;
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

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output as unknown as Uint8Array<ArrayBuffer>;
}
