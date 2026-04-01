import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON")!;

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  action?: string;
  user_ids?: string[]; // specific users, or empty = broadcast all
  topic?: string;
}

// Get Google OAuth2 access token from service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const unsignedToken = `${header}.${payload}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedToken}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMMessage(accessToken: string, projectId: string, token: string, payload: PushPayload) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  const message: any = {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/logo-3v.png",
          badge: payload.badge || "/logo-3v.png",
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          tag: payload.action || "general",
          data: {
            url: payload.url || "/",
            action: payload.action || "general",
          },
        },
        fcm_options: {
          link: payload.url || "/",
        },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  return { status: response.status, result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    const accessToken = await getAccessToken(serviceAccount);
    
    const payload: PushPayload = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tokens based on target
    let query = supabase.from("fcm_tokens").select("token, user_id, language");
    
    if (payload.user_ids && payload.user_ids.length > 0) {
      query = query.in("user_id", payload.user_ids);
    }

    const { data: tokens, error } = await query;
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No tokens found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    const invalidTokens: string[] = [];

    for (const t of tokens) {
      try {
        const r = await sendFCMMessage(accessToken, serviceAccount.project_id, t.token, payload);
        results.push(r);
        
        // Remove invalid tokens
        if (r.status === 404 || r.status === 410) {
          invalidTokens.push(t.token);
        }
      } catch (e) {
        console.error("FCM send error:", e);
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", invalidTokens);
    }

    return new Response(JSON.stringify({ 
      sent: results.filter(r => r.status === 200).length,
      failed: results.filter(r => r.status !== 200).length,
      cleaned: invalidTokens.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
