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
    const { question, userAnswer, keyPoints, sampleAnswer, books, chapters, language } = await req.json();
    const lang = (language || 'fr').split('-')[0];
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompts: Record<string, string> = {
      fr: `Tu es un expert en théologie catholique et en études bibliques.
Tu dois évaluer la réponse d'un utilisateur à une question biblique de façon méticuleuse et juste.
Contexte: ${books}, chapitres ${chapters}
Évalue selon: exactitude biblique, pertinence, profondeur, références scripturaires.
Sois encourageant mais honnête. Donne une note sur 10 et des commentaires constructifs.
Réponds UNIQUEMENT en JSON valide, en français.`,
      en: `You are an expert in Catholic theology and biblical studies.
You must evaluate a user's answer to a biblical question meticulously and fairly.
Context: ${books}, chapters ${chapters}
Evaluate based on: biblical accuracy, relevance, depth, scriptural references.
Be encouraging but honest. Give a score out of 10 and constructive comments.
Respond ONLY in valid JSON, in English.`,
      it: `Sei un esperto di teologia cattolica e studi biblici.
Devi valutare la risposta di un utente a una domanda biblica in modo meticoloso e giusto.
Contesto: ${books}, capitoli ${chapters}
Valuta secondo: accuratezza biblica, pertinenza, profondità, riferimenti scritturali.
Sii incoraggiante ma onesto. Dai un voto su 10 e commenti costruttivi.
Rispondi SOLO in JSON valido, in italiano.`
    };

    const userPrompts: Record<string, string> = {
      fr: `Question posée: "${question}"
Réponse de l'utilisateur: "${userAnswer}"
Points clés attendus: ${JSON.stringify(keyPoints)}
Exemple de bonne réponse: "${sampleAnswer}"
Évalue et fournis: {"score":7,"maxScore":10,"feedback":"...","strengths":["..."],"improvements":["..."],"missingPoints":["..."]}`,
      en: `Question asked: "${question}"
User's answer: "${userAnswer}"
Expected key points: ${JSON.stringify(keyPoints)}
Sample good answer: "${sampleAnswer}"
Evaluate and provide: {"score":7,"maxScore":10,"feedback":"...","strengths":["..."],"improvements":["..."],"missingPoints":["..."]}`,
      it: `Domanda posta: "${question}"
Risposta dell'utente: "${userAnswer}"
Punti chiave attesi: ${JSON.stringify(keyPoints)}
Esempio di buona risposta: "${sampleAnswer}"
Valuta e fornisci: {"score":7,"maxScore":10,"feedback":"...","strengths":["..."],"improvements":["..."],"missingPoints":["..."]}`
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompts[lang] || systemPrompts.fr },
          { role: "user", content: userPrompts[lang] || userPrompts.fr }
        ],
      }),
    });

    if (!response.ok) {
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

    let evaluation;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      evaluation = JSON.parse(jsonStr.trim());
    } catch {
      const fallbackMessages: Record<string, string> = {
        fr: "Réponse reçue. Merci pour votre participation.",
        en: "Answer received. Thank you for your participation.",
        it: "Risposta ricevuta. Grazie per la tua partecipazione."
      };
      evaluation = {
        score: 5, maxScore: 10,
        feedback: fallbackMessages[lang] || fallbackMessages.fr,
        strengths: [], improvements: [], missingPoints: []
      };
    }

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error evaluating answer:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
