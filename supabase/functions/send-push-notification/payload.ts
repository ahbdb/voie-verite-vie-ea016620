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