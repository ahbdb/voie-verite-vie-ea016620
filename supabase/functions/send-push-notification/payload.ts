export interface PushPayloadInput {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  action?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
}

const CALL_CHANNEL_ID = "incoming_calls";

/**
 * Pure builder for the Web Push notification payload.
 * Guarantees the call-notification contract:
 *   action === "call" | "live" → high urgency, requireInteraction, aggressive vibrate.
 */
export function buildNotificationPayload(payload: PushPayloadInput): { json: string; isCall: boolean } {
  const isCall = payload.action === "call" || payload.action === "live";
  const json = JSON.stringify({
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192x192.png",
      badge: payload.badge || "/badge-72x72.png",
      tag: payload.tag || `push-${Date.now()}`,
      requireInteraction: payload.requireInteraction ?? isCall,
      vibrate: payload.vibrate || (isCall ? [400, 200, 400, 200, 600] : [200, 100, 200]),
      action: payload.action || "general",
      data: { url: payload.url || "/", action: payload.action || "general" },
    },
  });
  return { json, isCall };
}

export function buildNativeFcmMessage(payload: PushPayloadInput, token: string) {
  const isCall = payload.action === "call" || payload.action === "live";
  const action = payload.action || "general";
  const url = payload.url || "/";
  const vibrate = payload.vibrate || (isCall ? [400, 200, 400, 200, 600] : [200, 100, 200]);

  return {
    isCall,
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        action,
        url,
        tag: payload.tag || `push-${Date.now()}`,
        channelId: isCall ? CALL_CHANNEL_ID : "default",
      },
      android: {
        priority: isCall ? "HIGH" : "NORMAL",
        ttl: "86400s",
        notification: {
          channel_id: isCall ? CALL_CHANNEL_ID : undefined,
          notification_priority: isCall ? "PRIORITY_MAX" : "PRIORITY_DEFAULT",
          visibility: isCall ? "PUBLIC" : "PRIVATE",
          sound: isCall ? "beep" : undefined,
          tag: payload.tag,
          default_vibrate_timings: false,
          vibrate_timings: vibrate.map((ms) => `${ms / 1000}s`),
        },
      },
    },
  };
}