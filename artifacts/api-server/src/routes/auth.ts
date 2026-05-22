import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, getUserAdminRole } from "../lib/auth";

const router = Router();

router.get("/auth/user", (req, res) => {
  const user = (req as any).user;
  if (!user) {
    res.json({ user: null });
    return;
  }
  res.json({ user });
});

router.get("/auth/profile", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const existing = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    if (existing.length === 0) {
      const newProfile = await db.insert(profiles).values({
        id: user.id,
        email: user.email || "",
        full_name: user.name || null,
        avatar_url: user.profileImage || null,
      }).returning();
      res.json(newProfile[0]);
    } else {
      res.json(existing[0]);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/auth/profile", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { full_name, birth_date, avatar_url } = req.body;
  try {
    const updated = await db.update(profiles)
      .set({ full_name, birth_date, avatar_url })
      .where(eq(profiles.id, user.id))
      .returning();
    res.json(updated[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.get("/auth/admin-role", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const role = await getUserAdminRole(user.id);
    res.json({ role });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

router.delete("/auth/account", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    await db.delete(userRoles).where(eq(userRoles.user_id, user.id));
    await db.delete(profiles).where(eq(profiles.id, user.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
