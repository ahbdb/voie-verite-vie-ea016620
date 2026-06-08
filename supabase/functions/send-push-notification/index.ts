import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildNotificationPayload } from "./payload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// VAPID keys — generated for Voie-Vérité-Vie push notifications
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BDZP1G3CVzMfjpDGH7MGktPHySL1O1ZqqpP6B5QSgp09f8xu3lN9BLnQ527CZNXIY9q6KoISzbKbmbIAS8_I0AU";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ??
  "D1ktZQBYTUY6rCSctUvT93VIwfUAQj3AeiTIoyZY1ZU";
const VAPID_SUBJECT = "mailto:contact@voie-verite-vie.com";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  action?: string;
  tag?: string;
  image?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  // Ciblage : si absent → tous les utilisateurs
  user_ids?: string[];
  // Si 'user' ou 'admin', filtre par rôle
  role?: "user" | "admin";
  // Si true, insère aussi dans la table notifications (déclenche Supabase Realtime)
  insert_notifications?: boolean;
}

function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodeB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), c => c.charCodeAt(0));
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  return crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t = new Uint8Array(info.length + 1);
  t.set(info);
  t[info.length] = 0x01;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prk, t));
  return okm.slice(0, length);
}

async function encryptPayload(payloadText: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payloadText);

  const senderKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", senderKeys.publicKey));

  const receiverPubRaw = decodeB64url(p256dh);
  const receiverPub = await crypto.subtle.importKey("raw", receiverPubRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);

  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: receiverPub }, senderKeys.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits);

  const authSecret = decodeB64url(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = new Uint8Array([...enc.encode("WebPush: info\0"), ...receiverPubRaw, ...senderPubRaw]);
  const prkKey = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const prkSalt = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prkSalt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prkSalt, enc.encode("Content-Encoding: nonce\0"), 12);

  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;

  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, padded));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const body = new Uint8Array(16 + 4 + 1 + senderPubRaw.length + ciphertext.length);
  let off = 0;
  body.set(salt, off); off += 16;
  body.set(rs, off); off += 4;
  body[off++] = senderPubRaw.length;
  body.set(senderPubRaw, off); off += senderPubRaw.length;
  body.set(ciphertext, off);
  return body;
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  offset++;
  const rLen = der[offset++];
  const r = der.slice(offset, offset + rLen); offset += rLen;
  offset++;
  const sLen = der[offset++];
  const s = der.slice(offset, offset + sLen);
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

async function vapidAuthHeader(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const claims = { aud: audience, exp: now + 43200, sub: VAPID_SUBJECT };
  const enc = new TextEncoder();
  const h = b64url(enc.encode(JSON.stringify(header)));
  const c = b64url(enc.encode(JSON.stringify(claims)));
  const unsigned = `${h}.${c}`;

  const pubBytes = decodeB64url(VAPID_PUBLIC_KEY);
  const x = b64url(pubBytes.slice(1, 33));
  const y = b64url(pubBytes.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: VAPID_PRIVATE_KEY, x, y, key_ops: ["sign"], ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(unsigned)));
  const rawSig = sig.length === 64 ? sig : derToRaw(sig);
  return `vapid t=${unsigned}.${b64url(rawSig)}, k=${VAPID_PUBLIC_KEY}`;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}


async function sendOne(tokenJson: string, payload: PushPayload): Promise<{ status: number; ok: boolean }> {
  let sub: PushSubscription;
  try { sub = JSON.parse(tokenJson) as PushSubscription; } catch { return { status: 0, ok: false }; }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return { status: 0, ok: false };

  const { json: notifJson, isCall } = buildNotificationPayload(payload);

  try {
    const [body, auth] = await Promise.all([
      encryptPayload(notifJson, sub.keys.p256dh, sub.keys.auth),
      vapidAuthHeader(sub.endpoint),
    ]);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        // High urgency = delivered even when device is in low-power/doze mode
        Urgency: isCall ? "high" : "normal",
      },
      body,
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    console.error("sendOne error:", err);
    return { status: 0, ok: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload: PushPayload = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Déterminer les user IDs ciblés ──────────────────────────────────────
    let targetUserIds: string[] | null = null;

    if (payload.user_ids && payload.user_ids.length > 0) {
      // Ciblage explicite par ID
      targetUserIds = payload.user_ids;
    } else if (payload.role) {
      // Ciblage par rôle
      const roleFilter = payload.role === "admin" ? ["admin", "admin_principal"] : ["user"];
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", roleFilter);
      targetUserIds = [...new Set((roleRows || []).map((r: { user_id: string }) => r.user_id))];
    }
    // Si targetUserIds === null → tous les utilisateurs

    // ── 2. Insérer dans la table notifications (Realtime in-app) ──────────────
    if (payload.insert_notifications) {
      let notifUserIds: string[] = targetUserIds ?? [];
      if (notifUserIds.length === 0) {
        // Tous les profils
        const { data: allProfiles } = await supabase.from("profiles").select("id");
        notifUserIds = (allProfiles || []).map((p: { id: string }) => p.id);
      }
      if (notifUserIds.length > 0) {
        const link = payload.url && payload.url !== "/" ? payload.url : null;
        const rows = notifUserIds.map((uid) => ({
          user_id: uid,
          title: payload.title,
          message: payload.body,
          type: payload.action || "announcement",
          link,
          is_read: false,
        }));
        // Insérer par lots de 100 pour éviter les timeouts
        for (let i = 0; i < rows.length; i += 100) {
          await supabase.from("notifications").insert(rows.slice(i, i + 100));
        }
        console.log(`Notifications insérées : ${rows.length}`);
      }
    }

    // ── 3. Envoyer les Web Push aux appareils enregistrés ─────────────────────
    let tokenQuery = supabase.from("fcm_tokens").select("token, user_id");
    if (targetUserIds && targetUserIds.length > 0) {
      tokenQuery = tokenQuery.in("user_id", targetUserIds);
    }

    const { data: tokens, error } = await tokenQuery;
    if (error) throw error;

    if (!tokens?.length) {
      return Response.json({ sent: 0, message: "No push subscriptions" }, { headers: corsHeaders });
    }

    let sent = 0, failed = 0;
    const expired: string[] = [];
    for (const t of tokens) {
      const r = await sendOne(t.token, payload);
      if (r.ok) { sent++; } else { failed++; if (r.status === 404 || r.status === 410) expired.push(t.token); }
    }
    if (expired.length) await supabase.from("fcm_tokens").delete().in("token", expired);

    console.log(`Push: ${sent} sent, ${failed} failed, ${expired.length} cleaned`);
    return Response.json({ sent, failed, cleaned: expired.length }, { headers: corsHeaders });
  } catch (err) {
    console.error("Push handler error:", err);
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
