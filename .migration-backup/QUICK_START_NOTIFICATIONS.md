# 🚀 Quick Start - Notifications Améliorées

## Le plus important en 60 secondes

### ✅ Ce qui a changé

**Avant:**
```typescript
// App.tsx - Ancien système
if (!sessionStorage.getItem('notification-welcome-sent')) {
  await sendWelcomeNotification();
  sessionStorage.setItem('notification-welcome-sent', 'true');
}
// ❌ Problèmes: sessionStorage limité, message générique, silencieux
```

**Après:**
```typescript
// App.tsx - Nouveau système
await sendDailyWelcomeNotification(user.id);
// ✅ Avantages:
// - Une fois par jour (pas par session)
// - Message adapté à l'heure (matin/soir)
// - Notification VISIBLE et AUDIBLE
// - Fonctionne même hors app
```

---

## 🎯 3 Fonctions clés

### 1️⃣ `sendVisibleNotification()`
**Pour les notifications visibles et audibles**

```typescript
import { sendVisibleNotification } from '@/lib/notification-service';

await sendVisibleNotification({
  title: '🌅 Bienvenue!',
  body: 'Bonjour! Ta nuit s\'est bien passée?',
  tag: 'welcome-today',
  silent: false,  // ← AUDIBLE
});
```

**Résultat:** Son + Vibration + Reste affichée ✓

---

### 2️⃣ `sendDailyWelcomeNotification()`
**Smart welcome notification**

```typescript
import { sendDailyWelcomeNotification } from '@/lib/change-notification-system';

// Dans App.tsx quand user est logged
useEffect(() => {
  if (user) {
    await sendDailyWelcomeNotification(user.id);
  }
}, [user?.id]);
```

**Logique automatique:**
- ✅ Vérifie localStorage
- ✅ Détecte l'heure
- ✅ Envoie message adapté
- ✅ Une seule fois par jour

---

### 3️⃣ localStorage tracking
**Pour suivre l'État par jour**

```typescript
// Format: welcome-notification-sent-{userId}-{YYYY-MM-DD}
// Exemple: welcome-notification-sent-user123-2025-02-16 → 'true'

// Dans la console:
localStorage.getItem('welcome-notification-sent-user123-2025-02-16')
// → 'true' = déjà envoyée
// → null = pas encore envoyée
```

---

## 🧪 Test maintenant

### 1️⃣ Vérifier la notification en direct

```bash
# Build et run
npm run build
npm run dev

# Ouvrir http://localhost:5173
# Se connecter
# ✅ Vérifier notification en haut du navigateur
```

### 2️⃣ Tester le localStorage

```javascript
// Console browser (F12)
Object.keys(localStorage).filter(k => k.includes('welcome'))
// ↓ Résultat attendu
// ["welcome-notification-sent-user123-2025-02-16", ...]
```

### 3️⃣ Forcer une nouvelle notification

```javascript
// Console browser
const userId = 'current-user-id'; // À récupérer depuis Auth
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
localStorage.removeItem(`welcome-notification-sent-${userId}-${today}`);
location.reload();
// ↓ Notification réapparaît!
```

---

## 🎨 Messages par heure

```
🌅 Matin (00:00 - 11:59)
   "Bonjour! J'espère que ta nuit s'est bien passée. Bienvenue..."

☀️  Midi (12:00 - 17:59)
   "Bienvenue! J'espère que ta journée se passe bien!"

🌙 Soir (18:00 - 23:59)
   "Bonsoir! J'espère que ta journée s'est bien passée..."
```

---

## 📱 Sur téléphone

### Android Chrome
```
┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🌅 Bienvenue!        ┃
┃ Bonjour! J'espère...  ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛
🔔 [Sound] 📱 [Vibrate]
[Reste visible jusqu'au clic]
```

### iOS Safari
```
Toast ou Banner notification
(notification système iOS)
```

---

## 🔧 Si vous voulez modifier

### Changer les messages
Éditer [change-notification-system.ts](src/lib/change-notification-system.ts#L160):

```typescript
export const sendDailyWelcomeNotification = async (userId?: string) => {
  // ...
  if (hour < 12) {
    welcomeMessage = 'VOTRE MESSAGE PERSONNALISÉ ICI'; // ← Modifier ici
  }
  // ...
}
```

### Changer l'heure de cutoff
```typescript
// Changer les limites horaires
if (hour < 12) { /* Matin */ }      // Avant 12h
else if (hour < 18) { /* Midi */ }  // 12h à 18h
else { /* Soir */ }                 // Après 18h
```

### Désactiver temporairement
```typescript
// Dans App.tsx, commenter:
// await sendDailyWelcomeNotification(user.id);
```

---

## 📋 Checklist de déploiement

- [ ] Code compilé: `npm run build` ✓
- [ ] TypeScript OK: Pas d'erreurs
- [ ] Service Worker enregistré: `public/notification-sw.js`
- [ ] localStorage fonctionnel
- [ ] Tested sur Chrome/Firefox
- [ ] Test sur mobile si possible
- [ ] Push to production `dist/` folder

---

## 🎓 Fichiers à connaître

```
src/lib/notification-service.ts
├─ sendSilentNotification()
├─ sendVisibleNotification()    ← NOUVEAU
└─ ...autres

src/lib/change-notification-system.ts
├─ initChangeNotificationSystem()
├─ sendDailyWelcomeNotification()    ← NOUVEAU
└─ sendWelcomeNotification() [deprecated]

src/App.tsx
├─ AppNotificationInitializer
└─ await sendDailyWelcomeNotification(user.id)    ← NOUVEAU

public/notification-sw.js
└─ Service Worker [IMPROVED]    ← AMÉLIORÉ
```

---

## ❓ FAQ rapide

**Q: Pourquoi localStorage et pas sessionStorage?**
A: sessionStorage est vidé à chaque nouveau tab/fermeture. localStorage persiste d'un jour à l'autre.

**Q: La notification s'affiche même sans permission?**
A: On demande la permission silencieusement. Si refusée, on continue (fallback).

**Q: Peut-on avoir plus qu'une notification par jour?**
A: Oui, créez une autre clé localStorage avec une autre date ou condition.

**Q: Sur quelle heure exacte ça bascule?**
A: Basé sur `new Date().getHours()` local du navigateur.

**Q: Fonctionnera sur Netlify/Vercel?**
A: Oui! C'est du JavaScript pur, pas de backend requis.

---

## 🚨 Troubleshooting

**Notification ne s'affiche pas?**
1. Vérifier permissions: `Notification.permission`
2. Vérifier Service Worker: DevTools → Application → Service Workers
3. Vérifier console: Chercher des erreurs
4. Vérifier localStorage: `localStorage.getItem('welcome-notification-sent-...')`

**Son ne se lance pas?**
1. Vérifier volume du téléphone (pas en silencieux)
2. Vérifier paramètres app Chrome
3. Vérifier `silent: false` dans le code

**Notification ne disparaît pas?**
C'est normal! `requireInteraction: true` veut dire qu'elle reste affichée.

---

## 🎯 Prochaine étape

```bash
# Pour mettre en production:
npm run build
# Puis copier le dossier dist/ sur votre serveur
# Déployer sur Netlify/Vercel/etc
```

**Voilà! Les notifications intelligentes sont prêtes! 🎉**

