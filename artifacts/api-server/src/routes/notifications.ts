import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { notifications, profiles, userRoles, fcmTokens } from "@workspace/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// ── VAPID Web Push setup ──────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@voie-verite-vie.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Send a Web Push notification to a stored subscription JSON string.
 * Silently drops invalid/expired subscriptions.
 */
async function sendWebPush(
  subscriptionJson: string,
  payload: object
): Promise<void> {
  try {
    const sub = JSON.parse(subscriptionJson) as webpush.PushSubscription;
    if (!sub?.endpoint) return;
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expired — caller should delete it; we just swallow here
    }
    // Other errors (network, etc.) are silently dropped so one bad subscription
    // doesn't block the others.
  }
}

/**
 * Build the push payload envelope used by notification-sw.js.
 */
function buildPushPayload(
  title: string,
  body: string,
  action: string,
  link: string | null
) {
  return {
    notification: {
      title,
      body,
      action,
      url: link || "/",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
    },
    data: { action, url: link || "/" },
  };
}

/**
 * Fan-out Web Push to a list of push subscription JSON strings.
 * Runs in parallel, ignores individual failures.
 */
async function fanOutWebPush(
  tokens: { token: string }[],
  title: string,
  body: string,
  action: string,
  link: string | null
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const payload = buildPushPayload(title, body, action, link);
  await Promise.allSettled(tokens.map((t) => sendWebPush(t.token, payload)));
}

// ── Notification CRUD ─────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.user_id, user.id))
      .orderBy(desc(notifications.created_at))
      .limit(50);
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch notifications" }); }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(notifications).set({ is_read: true }).where(eq(notifications.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to mark as read" }); }
});

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    await db.update(notifications).set({ is_read: true })
      .where(and(eq(notifications.user_id, user.id), eq(notifications.is_read, false)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to mark all as read" }); }
});

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    await db.delete(notifications)
      .where(and(eq(notifications.id, String(req.params.id)), eq(notifications.user_id, user.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete notification" }); }
});

// ── Broadcast endpoints (admin) ───────────────────────────────────────────────

router.post("/notifications/broadcast", requireAdmin, async (req, res) => {
  const { title, message, type = "announcement", link = null } = req.body;
  try {
    const allProfiles = await db.select({ id: profiles.id }).from(profiles);
    if (!allProfiles.length) { res.json({ inserted: 0 }); return; }

    const payload = allProfiles.map((p: { id: string }) => ({ user_id: p.id, title, message, type, link, is_read: false }));
    await db.insert(notifications).values(payload);

    // Fan-out Web Push to all subscribed devices
    const tokens = await db.select({ token: fcmTokens.token }).from(fcmTokens);
    void fanOutWebPush(tokens, title, message, type, link);

    res.json({ inserted: payload.length });
  } catch { res.status(500).json({ error: "Failed to broadcast notifications" }); }
});

router.post("/notifications/broadcast-role", requireAdmin, async (req, res) => {
  const { title, message, role, type = "announcement", link = null } = req.body;
  try {
    const roleFilter = role === "admin" ? ["admin", "admin_principal"] : ["user"];
    const roleRows = await db.select({ user_id: userRoles.user_id }).from(userRoles).where(inArray(userRoles.role, roleFilter));
    if (!roleRows.length) { res.json({ inserted: 0 }); return; }

    const uniqueIds = [...new Set(roleRows.map((r: { user_id: string }) => r.user_id))];
    const payload = uniqueIds.map((uid) => ({ user_id: uid, title, message, type, link, is_read: false }));
    await db.insert(notifications).values(payload);

    // Fan-out Web Push only to the targeted users
    if (uniqueIds.length > 0) {
      const tokens = await db.select({ token: fcmTokens.token }).from(fcmTokens)
        .where(inArray(fcmTokens.user_id, uniqueIds));
      void fanOutWebPush(tokens, title, message, type, link);
    }

    res.json({ inserted: payload.length });
  } catch { res.status(500).json({ error: "Failed to broadcast to role" }); }
});

router.post("/notifications/send", requireAdmin, async (req, res) => {
  const { user_id, title, message, type = "announcement", link = null } = req.body;
  try {
    const row = await db.insert(notifications).values({ user_id, title, message, type, link, is_read: false }).returning();

    // Single-user Web Push
    const tokens = await db.select({ token: fcmTokens.token }).from(fcmTokens)
      .where(eq(fcmTokens.user_id, user_id));
    void fanOutWebPush(tokens, title, message, type, link);

    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to send notification" }); }
});

// ── FCM / Web Push token management ──────────────────────────────────────────

router.post("/fcm-tokens", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const { token, platform, device_info, language, timezone } = req.body;
    const existing = await db.select().from(fcmTokens).where(and(eq(fcmTokens.user_id, user.id), eq(fcmTokens.token, token))).limit(1);
    if (existing.length) {
      const row = await db.update(fcmTokens).set({ platform, device_info, language, timezone, updated_at: new Date() }).where(eq(fcmTokens.id, existing[0].id)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(fcmTokens).values({ user_id: user.id, token, platform, device_info, language, timezone }).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to save FCM token" }); }
});

router.get("/notifications/token", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.select({ token: fcmTokens.token }).from(fcmTokens)
      .where(eq(fcmTokens.user_id, user.id))
      .orderBy(desc(fcmTokens.created_at))
      .limit(1);
    res.json(row[0] || { token: null });
  } catch { res.status(500).json({ error: "Failed to fetch token" }); }
});

router.post("/notifications/token", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const { token, platform, device_info, language, timezone } = req.body;
    const existing = await db.select().from(fcmTokens).where(and(eq(fcmTokens.user_id, user.id), eq(fcmTokens.token, token))).limit(1);
    if (existing.length) {
      const row = await db.update(fcmTokens).set({ platform, device_info, language, timezone, updated_at: new Date() }).where(eq(fcmTokens.id, existing[0].id)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(fcmTokens).values({ user_id: user.id, token, platform, device_info, language, timezone }).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to save token" }); }
});

router.patch("/notifications/token/language", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const { language } = req.body;
    await db.update(fcmTokens).set({ language }).where(eq(fcmTokens.user_id, user.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to update language" }); }
});

export default router;
