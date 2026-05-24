import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCkSym5xF-yY27Md_Sv8Ls8yqlpqdeScDA",
  authDomain: "voie-verite-vie-92cd3.firebaseapp.com",
  projectId: "voie-verite-vie-92cd3",
  storageBucket: "voie-verite-vie-92cd3.firebasestorage.app",
  messagingSenderId: "491460650214",
  appId: "1:491460650214:web:05d6554ab528c0753a0727",
};

// Firebase VAPID public key (Cloud Messaging → Web Push certificates)
export const FIREBASE_VAPID_KEY = "Nvibymz2P0iwMwthCvDLvWOwxyBb-Cw7pO3cs0TXJtY";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};
