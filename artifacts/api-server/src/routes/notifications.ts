import { Router } from "express";
import { db } from "@workspace/db";
import { notifications, profiles, userRoles, fcmTokens } from "@workspace/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

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
    await db.update(notifications).set({ is_read: true }).where(eq(notifications.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to mark as read" }); }
});

router.post("/notifications/broadcast", requireAdmin, async (req, res) => {
  const { title, message, type = "announcement", link = null } = req.body;
  try {
    const allProfiles = await db.select({ id: profiles.id }).from(profiles);
    if (!allProfiles.length) { res.json({ inserted: 0 }); return; }
    const payload = allProfiles.map((p) => ({ user_id: p.id, title, message, type, link, is_read: false }));
    await db.insert(notifications).values(payload);
    res.json({ inserted: payload.length });
  } catch { res.status(500).json({ error: "Failed to broadcast notifications" }); }
});

router.post("/notifications/broadcast-role", requireAdmin, async (req, res) => {
  const { title, message, role, type = "announcement", link = null } = req.body;
  try {
    const roleFilter = role === "admin" ? ["admin", "admin_principal"] : ["user"];
    const roleRows = await db.select({ user_id: userRoles.user_id }).from(userRoles).where(inArray(userRoles.role, roleFilter));
    if (!roleRows.length) { res.json({ inserted: 0 }); return; }
    const uniqueIds = [...new Set(roleRows.map((r) => r.user_id))];
    const payload = uniqueIds.map((uid) => ({ user_id: uid, title, message, type, link, is_read: false }));
    await db.insert(notifications).values(payload);
    res.json({ inserted: payload.length });
  } catch { res.status(500).json({ error: "Failed to broadcast to role" }); }
});

router.post("/notifications/send", requireAdmin, async (req, res) => {
  const { user_id, title, message, type = "announcement", link = null } = req.body;
  try {
    const row = await db.insert(notifications).values({ user_id, title, message, type, link, is_read: false }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to send notification" }); }
});

// FCM Tokens
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

export default router;
