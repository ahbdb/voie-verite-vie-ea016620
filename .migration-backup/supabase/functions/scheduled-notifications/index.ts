import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ScheduledPayload {
  type: "morning" | "afternoon" | "evening" | "activity_reminder" | "admin_broadcast";
  title?: string;
  body?: string;
  url?: string;
  action?: string;
  user_ids?: string[];
}

const MESSAGES = {
  morning: {
    fr: {
      title: "🌅 Bonjour ! Que Dieu bénisse votre journée",
      body: "Découvrez les lectures du jour et commencez votre journée avec une prière",
    },
    en: {
      title: "🌅 Good morning! May God bless your day",
      body: "Discover today's readings and start your day with a prayer",
    },
    it: {
      title: "🌅 Buongiorno! Che Dio benedica la tua giornata",
      body: "Scopri le letture del giorno e inizia la tua giornata con una preghiera",
    },
  },
  afternoon: {
    fr: {
      title: "☀️ Bon après-midi ! Restez dans la paix",
      body: "Un moment de réflexion spirituelle pour vous accompagner",
    },
    en: {
      title: "☀️ Good afternoon! Stay in peace",
      body: "A moment of spiritual reflection to accompany you",
    },
    it: {
      title: "☀️ Buon pomeriggio! Resta nella pace",
      body: "Un momento di riflessione spirituale per accompagnarti",
    },
  },
  evening: {
    fr: {
      title: "🌙 Bonsoir ! Bonne nuit et que Dieu veille sur vous",
      body: "Terminez votre journée avec une prière du soir",
    },
    en: {
      title: "🌙 Good evening! Good night and may God watch over you",
      body: "End your day with an evening prayer",
    },
    it: {
      title: "🌙 Buonasera! Buonanotte e che Dio vegli su di te",
      body: "Concludi la tua giornata con una preghiera serale",
    },
  },
};

const URLS: Record<string, string> = {
  morning: "/biblical-reading",
  afternoon: "/",
  evening: "/",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ScheduledPayload = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // For admin broadcasts, forward directly
    if (payload.type === "admin_broadcast") {
      const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || "/",
          action: payload.action || "general",
          user_ids: payload.user_ids,
        }),
      });
      const result = await pushResponse.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For scheduled types, get all tokens grouped by language
    const { data: tokens } = await supabase.from("fcm_tokens").select("token, language, user_id");
    
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageType = payload.type as keyof typeof MESSAGES;
    const messages = MESSAGES[messageType];
    
    if (!messages) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group tokens by language
    const byLang: Record<string, string[]> = {};
    for (const t of tokens) {
      const lang = (t.language || "fr").substring(0, 2);
      const key = lang in messages ? lang : "fr";
      if (!byLang[key]) byLang[key] = [];
      byLang[key].push(t.user_id);
    }

    let totalSent = 0;
    for (const [lang, userIds] of Object.entries(byLang)) {
      const msg = messages[lang as keyof typeof messages] || messages.fr;
      const uniqueIds = [...new Set(userIds)];
      
      const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: msg.title,
          body: msg.body,
          url: URLS[messageType] || "/",
          action: messageType,
          user_ids: uniqueIds,
        }),
      });
      
      const result = await pushResponse.json();
      totalSent += result.sent || 0;
    }

    return new Response(JSON.stringify({ sent: totalSent, type: payload.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scheduled notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
