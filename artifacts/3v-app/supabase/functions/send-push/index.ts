/**
 * Edge Function: send-push
 * Sends Web Push notifications (RFC 8291 + RFC 8292 VAPID) from the server.
 * Works even when the user's device has the app closed.
 *
 * Environment variables required (set in Supabase → Edge Functions → Secrets):
 *   VAPID_PRIVATE_KEY  = D1ktZQBYTUY6rCSctUvT93VIwfUAQj3AeiTIoyZY1ZU
 *
 * Request body:
 *   { title, body, url?, action?, icon?, badge?, vibrate?, requireInteraction?, tag?, user_ids? }
 *   user_ids: if omitted, sends to ALL registered devices
 *
 * Also handles scheduled types:
 *   { type: "morning" | "evening" | "midday" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "D1ktZQBYTUY6rCSctUvT93VIwfUAQj3AeiTIoyZY1ZU";
const VAPID_PUBLIC_KEY = "BDZP1G3CVzMfjpDGH7MGktPHySL1O1ZqqpP6B5QSgp09f8xu3lN9BLnQ527CZNXIY9q6KoISzbKbmbIAS8_I0AU";
const VAPID_SUBJECT = "mailto:contact@voie-verite-vie.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Scheduled messages ────────────────────────────────────────────────────────

const SCHEDULED: Record<string, { title: string; body: string; url: string; action: string }> = {
  morning: {
    title: "🌅 Bonjour ! Que Dieu bénisse votre journée",
    body: "Découvrez les lectures du jour et commencez avec une prière",
    url: "/biblical-reading",
    action: "bible",
  },
  midday: {
    title: "☀️ Angelus — 12h",
    body: "Un moment de recueillement au milieu de la journée",
    url: "/",
    action: "general",
  },
  evening: {
    title: "🌙 Bonsoir ! Prière du soir",
    body: "Terminez votre journée avec une prière et les vêpres",
    url: "/messe-office",
    action: "general",
  },
};

// ── Encoding helpers ──────────────────────────────────────────────────────────

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) => c.charCodeAt(0));
}

function b64urlEncode(u: Uint8Array): string {
  return btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── HKDF (RFC 5869) ──────────────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  return crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t = new Uint8Array(info.length + 1);
  t.set(info);
  t[info.length] = 0x01;
  return new Uint8Array(await crypto.subtle.sign("HMAC", prk, t)).slice(0, length);
}

// ── RFC 8291 — Payload encryption ─────────────────────────────────────────────

async function encryptPayload(text: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(text);

  const senderKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", senderKeys.publicKey));

  const receiverPubRaw = b64urlDecode(p256dh);
  const receiverPub = await crypto.subtle.importKey("raw", receiverPubRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);

  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: receiverPub }, senderKeys.privateKey, 256));
  const authSecret = b64urlDecode(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = new Uint8Array([...enc.encode("WebPush: info\0"), ...receiverPubRaw, ...senderPubRaw]);
  const prkKey = await hkdfExtract(authSecret, sharedBits);
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

// ── RFC 8292 — VAPID JWT ──────────────────────────────────────────────────────

let _vapidKey: CryptoKey | null = null;

async function getVapidKey(): Promise<CryptoKey> {
  if (_vapidKey) return _vapidKey;
  const pubBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  const x = b64urlEncode(pubBytes.slice(1, 33));
  const y = b64urlEncode(pubBytes.slice(33, 65));
  _vapidKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: VAPID_PRIVATE_KEY, x, y, key_ops: ["sign"], ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return _vapidKey;
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  let o = 2;
  if (der[1] & 0x80) o += der[1] & 0x7f;
  o++;
  const rLen = der[o++];
  const r = der.slice(o, o + rLen); o += rLen;
  o++;
  const sLen = der[o++];
  const s = der.slice(o, o + sLen);
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

async function vapidHeader(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const h = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64urlEncode(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })));
  const unsigned = `${h}.${c}`;
  const key = await getVapidKey();
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64urlEncode(derToRaw(sig))}, k=${VAPID_PUBLIC_KEY}`;
}

// ── Send one push ─────────────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  action?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  image?: string;
}

async function sendOne(tokenJson: string, p: PushPayload): Promise<{ ok: boolean; status: number }> {
  let sub: { endpoint: string; keys: { p256dh: string; auth: string } };
  try { sub = JSON.parse(tokenJson); } catch { return { ok: false, status: 0 }; }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return { ok: false, status: 0 };

  const notifJson = JSON.stringify({
    notification: {
      title: p.title,
      body: p.body,
      icon: p.icon ?? "/icon-192x192.png",
      badge: p.badge ?? "/badge-72x72.png",
      tag: p.tag ?? `push-${Date.now()}`,
      requireInteraction: p.requireInteraction ?? false,
      silent: false,
      vibrate: p.vibrate ?? [300, 100, 300],
      image: p.image,
      data: { url: p.url ?? "/", action: p.action ?? "general" },
      actions: [
        { action: "open", title: "Ouvrir" },
        { action: "dismiss", title: "Fermer" },
      ],
    },
  });

  try {
    const [body, auth] = await Promise.all([
      encryptPayload(notifJson, sub.keys.p256dh, sub.keys.auth),
      vapidHeader(sub.endpoint),
    ]);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve scheduled type to actual message
    let payload: PushPayload;
    if (body.type && SCHEDULED[body.type]) {
      payload = SCHEDULED[body.type];
    } else {
      payload = { title: body.title, body: body.body, url: body.url, action: body.action, icon: body.icon, badge: body.badge, tag: body.tag, vibrate: body.vibrate, requireInteraction: body.requireInteraction };
    }

    // Fetch tokens (all or filtered by user_ids)
    let query = supabase.from("fcm_tokens").select("token, user_id");
    if (body.user_ids?.length > 0) query = query.in("user_id", body.user_ids);
    const { data: tokens, error } = await query;

    if (error || !tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No tokens" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let sent = 0, failed = 0;
    const expired: string[] = [];

    await Promise.allSettled(tokens.map(async (t) => {
      const r = await sendOne(t.token, payload);
      if (r.ok) {
        sent++;
      } else {
        failed++;
        if (r.status === 404 || r.status === 410 || r.status === 401) expired.push(t.token);
      }
    }));

    if (expired.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", expired);
    }

    console.log(`send-push: "${payload.title}" → ${sent} sent, ${failed} failed, ${expired.length} cleaned`);

    return new Response(JSON.stringify({ sent, failed, cleaned: expired.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
