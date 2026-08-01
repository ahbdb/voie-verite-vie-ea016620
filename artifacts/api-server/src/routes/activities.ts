import { Router } from "express";
import { db } from "@workspace/db";
import { activities, activityRegistrations } from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

router.get("/activities", async (req, res) => {
  try {
    const rows = await db.select().from(activities).where(eq(activities.is_published, true)).orderBy(asc(activities.date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch activities" }); }
});

router.get("/activities/all", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(activities).orderBy(asc(activities.date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch activities" }); }
});

router.post("/activities", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(activities).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create activity" }); }
});

router.put("/activities/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(activities).set({ ...req.body, updated_at: new Date() }).where(eq(activities.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update activity" }); }
});

router.delete("/activities/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(activities).where(eq(activities.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete activity" }); }
});

router.post("/activity-registrations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(activityRegistrations).values({ ...req.body, user_id: user.id }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to register for activity" }); }
});

router.get("/activity-registrations", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(activityRegistrations).orderBy(desc(activityRegistrations.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch registrations" }); }
});

export default router;
