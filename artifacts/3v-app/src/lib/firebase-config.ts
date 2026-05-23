// VAPID public key for Web Push notifications (pair with VAPID_PRIVATE_KEY secret in Supabase)
export const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
export const VAPID_KEY_VERSION = "v2"; // bump when rotating keys so browsers re-subscribe
