import { Router } from "express";
import { db } from "@workspace/db";
import { donationSettings } from "@workspace/db/schema";

const router = Router();

// GET /api/donation-settings — return active Revolut bank info
router.get("/donation-settings", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(donationSettings)
      .limit(1);

    if (rows.length === 0) {
      // Return static defaults if DB not yet seeded
      return res.json({
        bank_name: "Revolut Bank UAB",
        bank_address: "Via Dante 7, 20123, Milano (ML), Italy",
        bic: "REVOITM2",
        iban: "IT94 O036 6901 6009 7214 2622 259",
        beneficiary_name: "DYLANNE BAUDOUIN AHOUFACK",
        beneficiary_title: "Fondateur-Modérateur de VOIE VERITE VIE",
        whatsapp_number: "+393513430349",
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("[donations] error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
