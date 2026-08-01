import { Router } from "express";
import { db } from "@workspace/db";
import {
  biblicalReadings, faqItems, galleryImages, neuvaines, pageContent,
  activityReports, prayerRequests, prayerResponses, quizzes, userQuizResponses,
  userReadingProgress,
} from "@workspace/db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// --- Biblical Readings ---
router.get("/biblical-readings", async (req, res) => {
  try {
    const { date, year, month } = req.query;
    let query = db.select().from(biblicalReadings);
    const conditions = [];
    if (date) conditions.push(eq(biblicalReadings.date, date as string));
    if (year) conditions.push(eq(biblicalReadings.year, Number(year)));
    if (month) conditions.push(eq(biblicalReadings.month, Number(month)));
    const rows = conditions.length
      ? await db.select().from(biblicalReadings).where(and(...conditions)).orderBy(asc(biblicalReadings.day_number))
      : await db.select().from(biblicalReadings).orderBy(asc(biblicalReadings.day_number));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch readings" }); }
});

router.post("/biblical-readings", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(biblicalReadings).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create reading" }); }
});

router.put("/biblical-readings/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(biblicalReadings).set(req.body).where(eq(biblicalReadings.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update reading" }); }
});

router.delete("/biblical-readings/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(biblicalReadings).where(eq(biblicalReadings.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete reading" }); }
});

// --- Reading Progress ---
router.get("/reading-progress", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const rows = await db.select().from(userReadingProgress).where(eq(userReadingProgress.user_id, user.id));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch progress" }); }
});

router.post("/reading-progress", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const { reading_id, completed } = req.body;
    const existing = await db.select().from(userReadingProgress)
      .where(and(eq(userReadingProgress.user_id, user.id), eq(userReadingProgress.reading_id, reading_id))).limit(1);
    if (existing.length) {
      const row = await db.update(userReadingProgress)
        .set({ completed, completed_at: completed ? new Date() : null })
        .where(eq(userReadingProgress.id, existing[0].id)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(userReadingProgress).values({ user_id: user.id, reading_id, completed, completed_at: completed ? new Date() : null }).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to update progress" }); }
});

// --- FAQ ---
router.get("/faq", async (req, res) => {
  try {
    const rows = await db.select().from(faqItems).where(eq(faqItems.is_published, true)).orderBy(asc(faqItems.sort_order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch FAQ" }); }
});

router.get("/faq/all", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(faqItems).orderBy(asc(faqItems.sort_order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch FAQ" }); }
});

router.post("/faq", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(faqItems).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create FAQ item" }); }
});

router.put("/faq/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(faqItems).set(req.body).where(eq(faqItems.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update FAQ item" }); }
});

router.delete("/faq/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(faqItems).where(eq(faqItems.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete FAQ item" }); }
});

// --- Gallery ---
router.get("/gallery", async (req, res) => {
  try {
    const rows = await db.select().from(galleryImages).where(eq(galleryImages.is_published, true)).orderBy(asc(galleryImages.sort_order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch gallery" }); }
});

router.get("/gallery/all", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(galleryImages).orderBy(asc(galleryImages.sort_order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch gallery" }); }
});

router.post("/gallery", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(galleryImages).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create gallery image" }); }
});

router.put("/gallery/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(galleryImages).set(req.body).where(eq(galleryImages.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update gallery image" }); }
});

router.delete("/gallery/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(galleryImages).where(eq(galleryImages.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete gallery image" }); }
});

// --- Neuvaines ---
router.get("/neuvaines", async (req, res) => {
  try {
    const rows = await db.select().from(neuvaines).where(eq(neuvaines.is_published, true)).orderBy(desc(neuvaines.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch neuvaines" }); }
});

router.get("/neuvaines/all", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(neuvaines).orderBy(desc(neuvaines.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch neuvaines" }); }
});

router.get("/neuvaines/:id", async (req, res) => {
  try {
    const rows = await db.select().from(neuvaines).where(eq(neuvaines.id, String(req.params.id))).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Failed to fetch neuvaine" }); }
});

router.post("/neuvaines", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(neuvaines).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create neuvaine" }); }
});

router.put("/neuvaines/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(neuvaines).set({ ...req.body, updated_at: new Date() }).where(eq(neuvaines.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update neuvaine" }); }
});

router.delete("/neuvaines/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(neuvaines).where(eq(neuvaines.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete neuvaine" }); }
});

// --- Page Content ---
router.get("/page-content/:key", async (req, res) => {
  try {
    const rows = await db.select().from(pageContent).where(eq(pageContent.page_key, String(req.params.key))).limit(1);
    res.json(rows[0] || null);
  } catch { res.status(500).json({ error: "Failed to fetch page content" }); }
});

router.post("/page-content", requireAdmin, async (req, res) => {
  try {
    const { page_key, title, subtitle, content } = req.body;
    const existing = await db.select().from(pageContent).where(eq(pageContent.page_key, page_key)).limit(1);
    if (existing.length) {
      const row = await db.update(pageContent).set({ title, subtitle, content, updated_at: new Date() }).where(eq(pageContent.page_key, page_key)).returning();
      res.json(row[0]);
    } else {
      const row = await db.insert(pageContent).values({ page_key, title, subtitle, content }).returning();
      res.json(row[0]);
    }
  } catch { res.status(500).json({ error: "Failed to save page content" }); }
});

// --- Prayer Forum ---
router.get("/prayer-requests", async (req, res) => {
  try {
    const rows = await db.select().from(prayerRequests).orderBy(desc(prayerRequests.created_at)).limit(50);
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch prayer requests" }); }
});

router.post("/prayer-requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(prayerRequests).values({ ...req.body, user_id: user.id }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create prayer request" }); }
});

router.delete("/prayer-requests/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(prayerRequests).where(eq(prayerRequests.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete prayer request" }); }
});

router.post("/prayer-requests/:id/pray", requireAuth, async (req, res) => {
  try {
    await db.update(prayerRequests)
      .set({ prayer_count: sql`${prayerRequests.prayer_count} + 1` })
      .where(eq(prayerRequests.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to increment prayer count" }); }
});

router.get("/prayer-requests/:id/responses", async (req, res) => {
  try {
    const rows = await db.select().from(prayerResponses).where(eq(prayerResponses.prayer_request_id, String(req.params.id))).orderBy(asc(prayerResponses.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch responses" }); }
});

router.post("/prayer-requests/:id/responses", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(prayerResponses).values({ prayer_request_id: String(req.params.id), user_id: user.id, content: req.body.content }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create response" }); }
});

// --- Activity Reports ---
router.get("/activity-reports", async (req, res) => {
  try {
    const rows = await db.select().from(activityReports).where(eq(activityReports.is_published, true)).orderBy(desc(activityReports.report_date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch activity reports" }); }
});

router.get("/activity-reports/all", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(activityReports).orderBy(desc(activityReports.report_date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch activity reports" }); }
});

router.post("/activity-reports", requireAdmin, async (req, res) => {
  try {
    const row = await db.insert(activityReports).values(req.body).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create activity report" }); }
});

router.put("/activity-reports/:id", requireAdmin, async (req, res) => {
  try {
    const row = await db.update(activityReports).set({ ...req.body, updated_at: new Date() }).where(eq(activityReports.id, String(req.params.id))).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update activity report" }); }
});

router.delete("/activity-reports/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(activityReports).where(eq(activityReports.id, String(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete activity report" }); }
});

export default router;
