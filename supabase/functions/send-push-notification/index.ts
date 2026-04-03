import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = "BFqOJNkwbF-xB98adrB-YyuLJ6RwOigIeS4utLQtEowrsxHZqE9GG_-5fxYOhdB117YU_dPSuO9Izx9m8iJAu0w";
const VAPID_SUBJECT = "mailto:contact@voie-verite-vie.com";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  action?: string;
  user_ids?: string[];
}

// ============ Web Push Protocol Implementation ============

function base64urlToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createVapidAuthHeader(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  // Create JWT
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import VAPID private key as ECDSA P-256
  const privateKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY);
  
  // Build PKCS8 wrapper for the raw 32-byte private key
  const pkcs8 = buildPkcs8(privateKeyBytes);
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const rawSig = derToRaw(new Uint8Array(sig));
  const signatureB64 = uint8ArrayToBase64url(rawSig);
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

// Build PKCS8 DER envelope for a raw 32-byte EC P-256 private key
function buildPkcs8(rawKey: Uint8Array): Uint8Array {
  // PKCS8 header for EC P-256
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  // After the private key bytes, we need the public key context tag
  // But for importKey we can omit the public key part
  const tail = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  
  // Actually, let's use JWK import instead - much simpler
  throw new Error("use_jwk");
}

// Convert DER ECDSA signature to raw 64-byte r||s
function derToRaw(der: Uint8Array): Uint8Array {
  // Some implementations return raw format directly
  if (der.length === 64) return der;
  
  // Parse DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2; // skip SEQUENCE tag + length
  if (der[1] & 0x80) offset += (der[1] & 0x7f); // long form length
  
  // Read r
  offset++; // 0x02
  const rLen = der[offset++];
  const r = der.slice(offset, offset + rLen);
  offset += rLen;
  
  // Read s
  offset++; // 0x02
  const sLen = der[offset++];
  const s = der.slice(offset, offset + sLen);
  
  // Pad/trim to 32 bytes each
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  
  return raw;
}

async function importVapidKey(): Promise<CryptoKey> {
  const privateKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY);
  
  // Use JWK format for importing EC private key
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: VAPID_PRIVATE_KEY,
    // Derive public key x,y from the uncompressed public key
    x: extractX(VAPID_PUBLIC_KEY),
    y: extractY(VAPID_PUBLIC_KEY),
  };
  
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

function extractX(publicKeyB64url: string): string {
  const bytes = base64urlToUint8Array(publicKeyB64url);
  // Uncompressed format: 0x04 || x (32 bytes) || y (32 bytes)
  return uint8ArrayToBase64url(bytes.slice(1, 33));
}

function extractY(publicKeyB64url: string): string {
  const bytes = base64urlToUint8Array(publicKeyB64url);
  return uint8ArrayToBase64url(bytes.slice(33, 65));
}

async function createVapidJwt(endpoint: string): Promise<{ authorization: string }> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const key = await importVapidKey();
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const rawSig = derToRaw(new Uint8Array(sig));
  const jwt = `${unsignedToken}.${uint8ArrayToBase64url(rawSig)}`;

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
  };
}

// ============ Payload Encryption (RFC 8291) ============

async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payloadText: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const payload = new TextEncoder().encode(payloadText);
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Import client public key
  const clientPublicKeyBytes = base64urlToUint8Array(subscription.keys.p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeys.privateKey,
    256
  );
  
  // Export server public key
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );
  
  // Auth secret
  const authSecret = base64urlToUint8Array(subscription.keys.auth);
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // HKDF for IKM
  const ikmInfo = buildInfo("WebPush: info\0", clientPublicKeyBytes, serverPublicKeyRaw);
  const ikm = await hkdfDerive(authSecret, new Uint8Array(sharedSecret), ikmInfo, 32);
  
  // HKDF for content encryption key
  const cekInfo = buildCekInfo("Content-Encoding: aes128gcm\0");
  const contentEncryptionKey = await hkdfDerive(salt, ikm, cekInfo, 16);
  
  // HKDF for nonce
  const nonceInfo = buildCekInfo("Content-Encoding: nonce\0");
  const nonce = await hkdfDerive(salt, ikm, nonceInfo, 12);
  
  // Pad payload (add delimiter byte 0x02 + optional padding)
  const paddedPayload = new Uint8Array(payload.length + 1);
  paddedPayload.set(payload);
  paddedPayload[payload.length] = 2; // delimiter
  
  // Encrypt with AES-128-GCM
  const encKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    "AES-GCM",
    false,
    ["encrypt"]
  );
  
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      encKey,
      paddedPayload
    )
  );
  
  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096;
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, rs);
  
  const body = new Uint8Array(
    16 + 4 + 1 + serverPublicKeyRaw.length + encrypted.length
  );
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(recordSize, offset); offset += 4;
  body[offset] = serverPublicKeyRaw.length; offset += 1;
  body.set(serverPublicKeyRaw, offset); offset += serverPublicKeyRaw.length;
  body.set(encrypted, offset);
  
  return { encrypted: body, salt, serverPublicKey: serverPublicKeyRaw };
}

function buildInfo(prefix: string, clientPublic: Uint8Array, serverPublic: Uint8Array): Uint8Array {
  const prefixBytes = new TextEncoder().encode(prefix);
  const info = new Uint8Array(prefixBytes.length + clientPublic.length + serverPublic.length);
  info.set(prefixBytes);
  info.set(clientPublic, prefixBytes.length);
  info.set(serverPublic, prefixBytes.length + clientPublic.length);
  return info;
}

function buildCekInfo(prefix: string): Uint8Array {
  return new TextEncoder().encode(prefix);
}

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt));
  
  // Actually, HKDF: extract then expand
  const extractKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkBytes = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, ikm));
  
  const expandKey = await crypto.subtle.importKey("raw", prkBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", expandKey, infoWithCounter));
  
  return okm.slice(0, length);
}

// ============ Send Push Notification ============

async function sendWebPush(
  subscriptionJson: string,
  payload: PushPayload
): Promise<{ status: number; ok: boolean }> {
  let subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  
  try {
    subscription = JSON.parse(subscriptionJson);
  } catch {
    return { status: 0, ok: false };
  }
  
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { status: 0, ok: false };
  }
  
  const notificationPayload = JSON.stringify({
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192x192.png",
      badge: payload.badge || "/badge-72x72.png",
      tag: payload.action || `push-${Date.now()}`,
      data: {
        url: payload.url || "/",
        action: payload.action || "general",
      },
    },
  });
  
  try {
    const { encrypted } = await encryptPayload(subscription, notificationPayload);
    const { authorization } = await createVapidJwt(subscription.endpoint);
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: encrypted,
    });
    
    return { status: response.status, ok: response.ok };
  } catch (err) {
    console.error("Web Push send error:", err);
    return { status: 0, ok: false };
  }
}

// ============ Main Handler ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: PushPayload = await req.json();
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

    console.log(`Sending push to ${tokens.length} subscriptions: "${payload.title}"`);

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const t of tokens) {
      const result = await sendWebPush(t.token, payload);
      
      if (result.ok) {
        sent++;
      } else {
        failed++;
        // 404 or 410 = subscription expired/invalid
        if (result.status === 404 || result.status === 410) {
          invalidTokens.push(t.token);
          console.log("Expired subscription removed for user:", t.user_id);
        } else if (result.status > 0) {
          console.log(`Push failed (${result.status}) for user:`, t.user_id);
        }
      }
    }

    // Clean up invalid subscriptions
    if (invalidTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", invalidTokens);
    }

    console.log(`Results: ${sent} sent, ${failed} failed, ${invalidTokens.length} cleaned`);

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
