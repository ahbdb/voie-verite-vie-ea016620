import { Router } from "express";
import { db } from "@workspace/db";
import { contactMessages } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

router.post("/contact", async (req, res) => {
  try {
    const { name, email, type, subject = "", message } = req.body;
    if (!name || !email || !type || !message) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    await db.insert(contactMessages).values({ name, email, type, subject, message });
    res.json({ success: true, message: "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais." });
  } catch { res.status(500).json({ error: "Failed to submit contact message" }); }
});

router.get("/contact-messages", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch contact messages" }); }
});

export default router;
