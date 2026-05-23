import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { books, chapters, dayNumber, difficulty, language } = await req.json();
    const lang = (language || 'fr').split('-')[0];
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${difficulty} quiz in ${lang} for: ${books}, chapters ${chapters}, day ${dayNumber}`);

    const langInstructions: Record<string, { difficultyLabels: Record<string, string>, systemBase: string, promptBase: string }> = {
      fr: {
        difficultyLabels: {
          easy: "Questions de niveau débutant/facile. Questions simples sur les faits principaux, les personnages, les événements clés.",
          medium: "Questions de niveau intermédiaire. Questions sur les thèmes, les leçons morales, les liens entre passages.",
          hard: "Questions de niveau difficile. Questions approfondies sur l'exégèse, les références de versets précis, les parallèles bibliques.",
          expert: "Questions de niveau expert. Questions très complexes sur les nuances théologiques, les références croisées, l'analyse littéraire."
        },
        systemBase: `Tu es un expert en théologie catholique et en études bibliques. Tu génères des quiz éducatifs sur la Bible en français.
Tu dois créer exactement 20 questions au total: 15 questions à choix multiples et 5 questions à réponse ouverte COURTES.
IMPORTANT: Inclus des questions sur des références de versets précis, personnages, lieux, événements, interprétation et exégèse.
Les questions ouvertes doivent appeler des réponses de 2-3 phrases maximum.
Réponds UNIQUEMENT en JSON valide.`,
        promptBase: `Génère un quiz de niveau DIFFICULTY sur BOOKS, chapitres CHAPTERS.`
      },
      en: {
        difficultyLabels: {
          easy: "Beginner/easy level questions. Simple questions about main facts, characters, key events.",
          medium: "Intermediate level questions. Questions about themes, moral lessons, connections between passages.",
          hard: "Difficult level questions. In-depth questions about exegesis, precise verse references, biblical parallels.",
          expert: "Expert level questions. Very complex questions about theological nuances, cross-references, literary analysis."
        },
        systemBase: `You are an expert in Catholic theology and biblical studies. You generate educational Bible quizzes in English.
You must create exactly 20 questions total: 15 multiple choice questions and 5 SHORT open-ended questions.
IMPORTANT: Include questions about precise verse references, characters, places, events, interpretation and exegesis.
Open-ended questions should require 2-3 sentence answers maximum.
Respond ONLY in valid JSON.`,
        promptBase: `Generate a DIFFICULTY level quiz on BOOKS, chapters CHAPTERS.`
      },
      it: {
        difficultyLabels: {
          easy: "Domande di livello principiante/facile. Domande semplici sui fatti principali, personaggi, eventi chiave.",
          medium: "Domande di livello intermedio. Domande su temi, lezioni morali, collegamenti tra passaggi.",
          hard: "Domande di livello difficile. Domande approfondite sull'esegesi, riferimenti precisi ai versetti, paralleli biblici.",
          expert: "Domande di livello esperto. Domande molto complesse sulle sfumature teologiche, riferimenti incrociati, analisi letteraria."
        },
        systemBase: `Sei un esperto di teologia cattolica e studi biblici. Generi quiz educativi sulla Bibbia in italiano.
Devi creare esattamente 20 domande in totale: 15 domande a scelta multipla e 5 domande aperte BREVI.
IMPORTANTE: Includi domande su riferimenti precisi ai versetti, personaggi, luoghi, eventi, interpretazione ed esegesi.
Le domande aperte devono richiedere risposte di 2-3 frasi al massimo.
Rispondi SOLO in JSON valido.`,
        promptBase: `Genera un quiz di livello DIFFICULTY su BOOKS, capitoli CHAPTERS.`
      }
    };

    const instructions = langInstructions[lang] || langInstructions.fr;
    const diffLabel = instructions.difficultyLabels[difficulty as string] || instructions.difficultyLabels.easy;

    const systemPrompt = `${instructions.systemBase}
${diffLabel}`;

    const userPrompt = `${instructions.promptBase.replace('DIFFICULTY', difficulty).replace('BOOKS', books).replace('CHAPTERS', chapters)}

Format JSON:
{
  "multipleChoice": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ],
  "openEnded": [
    {
      "question": "...",
      "keyPoints": ["..."],
      "sampleAnswer": "..."
    }
  ]
}

15 multiple choice + 5 open-ended.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    let quizData;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      quizData = JSON.parse(jsonStr.trim());
      
      if (!quizData.multipleChoice || !quizData.openEnded) {
        throw new Error("Invalid quiz structure");
      }
      
      // Shuffle MC options
      quizData.multipleChoice = quizData.multipleChoice.map((q: any, idx: number) => {
        if (!q.options || q.options.length < 2) throw new Error(`Q${idx} missing options`);
        if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          throw new Error(`Q${idx} invalid correctIndex`);
        }
        const options = [...q.options];
        const correctAnswer = options[q.correctIndex];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        return { ...q, options, correctIndex: options.indexOf(correctAnswer) };
      });
      
    } catch (parseError) {
      console.error("Failed to parse quiz JSON:", parseError, content);
      throw new Error("Failed to parse quiz data");
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating quiz:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
