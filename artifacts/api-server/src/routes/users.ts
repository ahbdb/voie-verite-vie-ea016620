import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(profiles).orderBy(desc(profiles.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch users" }); }
});

router.get("/user-roles", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(userRoles);
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch roles" }); }
});

router.post("/user-roles", requireAdmin, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    const existing = await db.select().from(userRoles).where(eq(userRoles.user_id, user_id)).limit(1);
    if (existing.length) {
      const row = await db.update(userRoles).set({ role }).where(eq(userRoles.user_id, user_id)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(userRoles).values({ user_id, role }).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to set role" }); }
});

router.delete("/user-roles/:userId", requireAdmin, async (req, res) => {
  try {
    await db.delete(userRoles).where(eq(userRoles.user_id, req.params.userId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete role" }); }
});

export default router;
