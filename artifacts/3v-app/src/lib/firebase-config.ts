import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase web config — these are PUBLIC client-side keys (not secrets).
// They are secured by Firebase Security Rules, not by secrecy.
// Values must be set as VITE_ environment variables in Netlify / .env.local.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCkSym5xF-yY27Md_Sv8Ls8yqlpqdeScDA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "voie-verite-vie-92cd3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "voie-verite-vie-92cd3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "voie-verite-vie-92cd3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "491460650214",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:491460650214:web:05d6554ab528c0753a0727",
};

// VAPID public key for Web Push — also a public value, not a secret.
export const FIREBASE_VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "Nvibymz2P0iwMwthCvDLvWOwxyBb-Cw7pO3cs0TXJtY";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};
