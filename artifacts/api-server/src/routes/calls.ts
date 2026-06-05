import { Router } from "express";
import { db } from "@workspace/db";
import { scheduledSessions, sessionReminders, videoRooms, videoRoomMessages, videoMessageReactions, streamingSettings } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// Scheduled Sessions
router.get("/scheduled-sessions", async (req, res) => {
  try {
    const rows = await db.select().from(scheduledSessions).orderBy(desc(scheduledSessions.scheduled_date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch sessions" }); }
});

router.post("/scheduled-sessions", requireAdmin, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(scheduledSessions).values({ ...req.body, created_by: user.id }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create session" }); }
});

router.put("/scheduled-sessions/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(scheduledSessions).set({ ...req.body, updated_at: new Date() }).where(eq(scheduledSessions.id, req.params.id)).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update session" }); }
});

router.delete("/scheduled-sessions/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(scheduledSessions).where(eq(scheduledSessions.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete session" }); }
});

router.post("/scheduled-sessions/:id/remind", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const existing = await db.select().from(sessionReminders)
      .where(and(eq(sessionReminders.session_id, req.params.id as any), eq(sessionReminders.user_id, user.id))).limit(1);
    if (existing.length) { res.json({ already: true }); return; }
    const row = await db.insert(sessionReminders).values({ session_id: req.params.id as any, user_id: user.id }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to set reminder" }); }
});

router.delete("/scheduled-sessions/:id/remind", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    await db.delete(sessionReminders).where(and(eq(sessionReminders.session_id, req.params.id as any), eq(sessionReminders.user_id, user.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to remove reminder" }); }
});

// Video Rooms
router.get("/video-rooms", async (req, res) => {
  try {
    const rows = await db.select().from(videoRooms).where(eq(videoRooms.is_active, true)).orderBy(desc(videoRooms.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch video rooms" }); }
});

router.get("/video-rooms/:id", async (req, res) => {
  try {
    const rows = await db.select().from(videoRooms).where(eq(videoRooms.id, req.params.id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Failed to fetch video room" }); }
});

router.post("/video-rooms", requireAdmin, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(videoRooms).values({ ...req.body, created_by: user.id }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create video room" }); }
});

router.put("/video-rooms/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(videoRooms).set({ ...req.body, updated_at: new Date() }).where(eq(videoRooms.id, req.params.id)).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update video room" }); }
});

router.delete("/video-rooms/:id", requireAdmin, async (req, res) => {
  try {
    await db.update(videoRooms).set({ is_active: false }).where(eq(videoRooms.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete video room" }); }
});

router.get("/video-rooms/:id/messages", async (req, res) => {
  try {
    const rows = await db.select().from(videoRoomMessages).where(eq(videoRoomMessages.room_id, req.params.id as any)).orderBy(desc(videoRoomMessages.created_at)).limit(100);
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

router.post("/video-rooms/:id/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(videoRoomMessages).values({ room_id: req.params.id as any, user_id: user.id, content: req.body.content, display_name: req.body.display_name }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to send message" }); }
});

// Streaming settings
router.get("/streaming-settings", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(streamingSettings).limit(1);
    res.json(rows[0] || null);
  } catch { res.status(500).json({ error: "Failed to fetch streaming settings" }); }
});

router.post("/streaming-settings", requireAdmin, async (req, res) => {
  try {
    const existing = await db.select().from(streamingSettings).limit(1);
    if (existing.length) {
      const row = await db.update(streamingSettings).set({ ...req.body, updated_at: new Date() }).where(eq(streamingSettings.id, existing[0].id)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(streamingSettings).values(req.body).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to save streaming settings" }); }
});

export default router;
