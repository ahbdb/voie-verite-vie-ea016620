import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  user_ids?: string[];
}

// Get Google OAuth2 access token from service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header and payload
  const headerB64 = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadB64 = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const unsignedToken = `${headerB64}.${payloadB64}`;

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

  const signatureB64 = base64url(new Uint8Array(signature));
  const signedToken = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedToken}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("OAuth token error:", tokenData);
    throw new Error("Failed to get access token");
  }
  return tokenData.access_token;
}

function base64url(input: string | Uint8Array): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    b64 = btoa(String.fromCharCode(...input));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Extract FCM registration token from a stored token
// The token might be a raw FCM token string OR a JSON push subscription
function extractFCMToken(storedToken: string): string | null {
  try {
    const parsed = JSON.parse(storedToken);
    // It's a PushSubscription JSON - extract token from endpoint
    if (parsed.endpoint) {
      // Chrome/Edge FCM endpoints: https://fcm.googleapis.com/fcm/send/TOKEN
      const fcmMatch = parsed.endpoint.match(/\/fcm\/send\/(.+)$/);
      if (fcmMatch) return fcmMatch[1];
      
      // FCM v1 endpoints: https://fcm.googleapis.com/wp/TOKEN
      const wpMatch = parsed.endpoint.match(/\/wp\/(.+)$/);
      if (wpMatch) return wpMatch[1];

      console.log("Non-FCM endpoint, skipping:", parsed.endpoint.substring(0, 60));
      return null;
    }
    return null;
  } catch {
    // It's already a plain FCM token string
    return storedToken;
  }
}

async function sendFCMMessage(
  accessToken: string, 
  projectId: string, 
  fcmToken: string, 
  payload: PushPayload
) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icon-192x192.png",
          badge: payload.badge || "/badge-72x72.png",
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200, 100, 200],
          tag: payload.action || `push-${Date.now()}`,
          renotify: true,
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
    
    // Ensure app name is always in title
    if (!payload.title.includes("Voie") && !payload.title.includes("VVV")) {
      payload.title = `${payload.title}`;
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tokens based on target
    let query = supabase.from("fcm_tokens").select("token, user_id, language");
    
    if (payload.user_ids && payload.user_ids.length > 0) {
      query = query.in("user_id", payload.user_ids);
    }

    const { data: tokens, error } = await query;
    
    if (error) {
      console.error("Error fetching tokens:", error);
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

    console.log(`Processing ${tokens.length} tokens for "${payload.title}"`);

    const results = [];
    const invalidTokens: string[] = [];

    for (const t of tokens) {
      const fcmToken = extractFCMToken(t.token);
      if (!fcmToken) {
        console.log("Skipping non-FCM token for user:", t.user_id);
        continue;
      }

      try {
        const r = await sendFCMMessage(accessToken, serviceAccount.project_id, fcmToken, payload);
        results.push(r);
        
        if (r.status === 404 || r.status === 410) {
          invalidTokens.push(t.token);
          console.log("Invalid token removed for user:", t.user_id);
        } else if (r.status !== 200) {
          console.log("FCM send failed:", r.status, JSON.stringify(r.result));
        }
      } catch (e) {
        console.error("FCM send error:", e);
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", invalidTokens);
    }

    const sent = results.filter(r => r.status === 200).length;
    const failed = results.filter(r => r.status !== 200).length;

    console.log(`Push results: ${sent} sent, ${failed} failed, ${invalidTokens.length} cleaned`);

    return new Response(JSON.stringify({ sent, failed, cleaned: invalidTokens.length }), {
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
