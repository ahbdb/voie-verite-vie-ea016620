import { Router } from "express";
import { db } from "@workspace/db";
import { aiConversations, aiMessages } from "@workspace/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/ai/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const rows = await db.select().from(aiConversations)
      .where(eq(aiConversations.user_id, user.id))
      .orderBy(desc(aiConversations.updated_at))
      .limit(20);
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch conversations" }); }
});

router.post("/ai/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const row = await db.insert(aiConversations).values({ user_id: user.id, title: req.body.title || "Nouvelle conversation" }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to create conversation" }); }
});

router.patch("/ai/conversations/:id", requireAuth, async (req, res) => {
  try {
    const row = await db.update(aiConversations).set({ ...req.body, updated_at: new Date() }).where(eq(aiConversations.id, req.params.id as any)).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to update conversation" }); }
});

router.delete("/ai/conversations/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(aiMessages).where(eq(aiMessages.conversation_id, req.params.id as any));
    await db.delete(aiConversations).where(eq(aiConversations.id, req.params.id as any));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete conversation" }); }
});

router.get("/ai/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(aiMessages).where(eq(aiMessages.conversation_id, req.params.id as any)).orderBy(asc(aiMessages.created_at));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

router.post("/ai/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const row = await db.insert(aiMessages).values({ conversation_id: req.params.id as any, role: req.body.role, content: req.body.content }).returning();
    res.json(row[0]);
  } catch { res.status(500).json({ error: "Failed to save message" }); }
});

// AI chat streaming endpoint - proxies to OpenAI
router.post("/ai/chat", requireAuth, async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: "AI not configured" });
    return;
  }

  try {
    const { messages } = req.body;

    const systemPrompt = `Tu es un assistant spirituel catholique pour l'association Voie, Vérité, Vie (3V) basée au Cameroun. 
Tu réponds en français par défaut (ou dans la langue de l'utilisateur), avec bienveillance et profondeur spirituelle. 
Tu aides avec : lectures bibliques, prières, méditations, spiritualité catholique, vie de l'Église.
Tu restes toujours respectueux, fidèle à l'enseignement catholique, et bienveillant.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) { res.status(429).json({ error: "Rate limit exceeded" }); return; }
      res.status(status).json({ error: "AI request failed" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "AI chat failed" });
  }
});

// Quiz generation
router.post("/ai/generate-quiz", requireAuth, async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) { res.status(500).json({ error: "AI not configured" }); return; }

  const { books, chapters, day_number, difficulty = "medium", lang = "fr" } = req.body;

  try {
    const prompt = `Génère un quiz biblique sur ${books} ${chapters} (Jour ${day_number}).
Difficulté: ${difficulty}. Langue: ${lang}.
Format JSON: { "multipleChoice": [{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."},...(5 questions)], "openEnded": [{"question":"...","keyPoints":["..."],"sampleAnswer":"..."},...(2 questions)] }
Réponds uniquement avec le JSON valide.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 2000 }),
    });

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Failed to parse quiz" }); return; }
    res.json(JSON.parse(jsonMatch[0]));
  } catch { res.status(500).json({ error: "Failed to generate quiz" }); }
});

// Bible translation
router.post("/ai/translate-bible-chapter", async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) { res.status(500).json({ error: "AI not configured" }); return; }

  const { verses, bookName, chapterNumber, targetLang = "en", patchEmptyVerses = false } = req.body;

  try {
    const versesToTranslate = patchEmptyVerses
      ? verses.filter((v: any) => !v.text || !v.text.trim())
      : verses;

    if (!versesToTranslate.length) { res.json({ verses, patched: 0 }); return; }

    const verseText = versesToTranslate.map((v: any) => `${v.number}. ${v.text || ""}`).join("\n");
    const prompt = patchEmptyVerses
      ? `Complete the missing French Bible verses for ${bookName} chapter ${chapterNumber}. Return JSON: {"verses":[{"number":N,"text":"..."}],"patched":N}`
      : `Translate these Bible verses from ${bookName} chapter ${chapterNumber} to ${targetLang}. Return JSON: {"verses":[{"number":N,"text":"..."}]}
Verses:\n${verseText}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 3000 }),
    });

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.json({ verses, patched: 0 }); return; }
    res.json(JSON.parse(jsonMatch[0]));
  } catch { res.json({ verses: req.body.verses, patched: 0 }); }
});

// Quiz evaluation
router.post("/ai/evaluate-answer", requireAuth, async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) { res.status(500).json({ error: "AI not configured" }); return; }

  const { question, keyPoints, sampleAnswer, userAnswer, lang = "fr" } = req.body;

  try {
    const prompt = `Évalue la réponse de l'utilisateur à cette question biblique en ${lang}.
Question: ${question}
Points clés attendus: ${keyPoints.join(", ")}
Réponse modèle: ${sampleAnswer}
Réponse utilisateur: ${userAnswer}
Format JSON: {"score":N,"maxScore":10,"feedback":"...","strengths":["..."],"improvements":["..."],"missingPoints":["..."]}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 800 }),
    });

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Failed to parse evaluation" }); return; }
    res.json(JSON.parse(jsonMatch[0]));
  } catch { res.status(500).json({ error: "Failed to evaluate answer" }); }
});

export default router;
