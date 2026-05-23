// notify-session — broadcast a rich WhatsApp-style push notification
// when a session goes live or is about to start.
//
// Body: { session_id: string, kind: "live" | "starting_soon" | "scheduled", target?: "all" | "reminders" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ORIGIN = "https://voie-verite-vie.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtGmt(date: string, time: string): string {
  const d = new Date(`${date}T${time}Z`);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} GMT`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { session_id, kind = "live", target = "all" } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: session, error } = await supabase
      .from("scheduled_sessions")
      .select("id, title, description, session_type, scheduled_date, scheduled_time, status")
      .eq("id", session_id)
      .maybeSingle();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Choose recipients
    let userIds: string[] | undefined = undefined;
    if (target === "reminders") {
      const { data: reminders } = await supabase
        .from("session_reminders")
        .select("user_id")
        .eq("session_id", session_id);
      userIds = (reminders || []).map((r: any) => r.user_id);
      if (userIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "no reminders" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const timeLabel = fmtGmt(session.scheduled_date, session.scheduled_time);
    const typeEmoji = session.session_type === "audio" ? "🎙️"
      : session.session_type === "live" ? "🔴" : "📹";

    let title = "";
    let body = "";
    let vibrate: number[] = [300, 100, 300];

    if (kind === "live") {
      title = `🔴 EN DIRECT — ${session.title}`;
      body = `La session vient de commencer. Rejoignez la communauté maintenant !`;
      vibrate = [400, 100, 400, 100, 600];
    } else if (kind === "starting_soon") {
      title = `⏰ Bientôt en direct — ${session.title}`;
      body = `Démarrage prévu à ${timeLabel}. Préparez-vous à nous rejoindre.`;
      vibrate = [300, 100, 300];
    } else {
      title = `📅 Nouvelle session programmée`;
      body = `${typeEmoji} ${session.title} — ${timeLabel}`;
    }

    const joinUrl = `${APP_ORIGIN}/calls-lives?join=${session.id}`;
    const imageUrl = `${SUPABASE_URL}/functions/v1/session-share/${session.id}/image.svg`;

    const pushBody = {
      title,
      body,
      image: imageUrl,
      url: joinUrl,
      joinUrl,
      action: kind === "live" ? "live" : "session",
      tag: `session-${session.id}-${kind}`,
      vibrate,
      requireInteraction: kind === "live",
      actions: kind === "live"
        ? [
            { action: "join", title: "🚪 Rejoindre" },
            { action: "dismiss", title: "✕ Plus tard" },
          ]
        : [
            { action: "remind", title: "🔔 Voir" },
            { action: "dismiss", title: "✕ OK" },
          ],
      user_ids: userIds,
    };

    // Call existing send-push-notification function
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(pushBody),
    });

    const result = await resp.json();
    return new Response(JSON.stringify({ ok: true, kind, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-session error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});