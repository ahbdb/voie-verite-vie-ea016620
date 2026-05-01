# ⚡ Guide Rapide Admin - Notifications Automatiques

## Pour les impatients ⏱️

### 1️⃣ C'est automatique! 
Le scheduler démarre automatiquement à chaque chargement de l'app. **Rien à faire**.

### 2️⃣ Tester les notifications
```
Aller à: /admin/notification-scheduler
        ↓
    Cliquer sur "Test" 💖 💪 🙏 📱
        ↓
   Notification reçue ✅
```

### 3️⃣ Voir les heures
| Heure | Message |
|-------|---------|
| 08:00 | 💖 Amour |
| 11:00 | 💪 Punch |
| 12:30 | 🙏 Prière midi |
| 15:00 | 📱 Promo |
| 20:00 | 🙏 Prière soir |

### 4️⃣ Changer les heures
Modifier: `/src/services/notification-schedule-config.ts`
```typescript
{
  hour: 8,      // Changer ici
  minute: 0,    // Et ici
  description: '💖 Message d\'amour',
  // ...
}
```
Puis relancer l'app.

### 5️⃣ Ajouter/Modifier messages

**Messages d'amour**:
```typescript
// /src/services/motivational-notifications.ts
export const loveMessages = [
  "Votre message ici ❤️",
  // ...
];
```

**Messages punch**:
```typescript
export const punchMessages = [
  "Votre message ici 💪",
  // ...
];
```

**Message de promotion**:
```typescript
export const promotionMessages = [
  "Découvrez notre super app! 📱",
  // ...
];
```

**Prières** (automatiques):
Viennent des lectures bibliques du jour (trop complexe à modifier, laissez default)

### 6️⃣ Admin Dashboard
Lien: `/admin/notification-scheduler`

Montre:
- 📊 Nombre de notifs envoyées aujourd'hui
- ✅ Taux de succès
- ⏰ Calendrier d'aujourd'hui
- 📋 Prochaines notifs
- 🧪 Boutons de test

### 7️⃣ Dépannage 5 sec

**"Rien ne s'affiche?"**
```javascript
// Console (F12):
runNotificationCheck()
// Voir le diagnostic complet
```

**"Service Worker pas là?"**
```javascript
// Console:
navigator.serviceWorker.getRegistrations()
```

**"Notifications pas des Web Push?"**
→ Vérifier que notifications sont accordées
→ Vérifier HTTPS/certificat valide
→ Relancer l'app

### 8️⃣ Limites (changer si besoin)

Actuellement max:
- 7 notifs/jour
- 3 par heure
- 5 min minimum entre

Modifier: `/src/services/notification-schedule-config.ts`
```typescript
export const notificationLimits = {
  maxPerDay: 7,           // ← changer ici
  maxPerHour: 3,          // ← ou ici
  minIntervalMinutes: 5,  // ← ou ici
};
```

---

## En cas de problème 🆘

### Les notifications ne s'envoient pas
1. Ouvrir Console (F12)
2. Taper: `runNotificationCheck()`
3. Regarder les résultats
4. Chercher les ❌ rouge

### Service Worker en problème
1. F12 → Application tab
2. Chercher "notification-sw"
3. S'il dit "activated and running" → OK ✅
4. S'il dit autre chose → hard refresh (Ctrl+Shift+R)

### Web Push ne marche pas
- ⚠️ Doit être en HTTPS (localhost OK)
- ⚠️ Notifications doivent être accordées
- ⚠️ Pas de Safari avec version < 16

### Debug mode ON
Pour logs plus détaillés:
```typescript
// Dans App.tsx, changer:
initializeNotificationScheduler(false); // ← false
// En:
initializeNotificationScheduler(true);  // ← true
```

---

## Architecture super simple 🏗️

```
App démarre
    ↓
initializeNotificationScheduler() lancé
    ↓
Scheduler tourne en boucle chaque minute
    ↓
À chaque heure du calendrier:
  - Déclenche la fonction du message
  - Envoie via broadcastNotificationService
  - Web Push reçy par Service Worker
  - Notif affichée en haut de l'écran
    ↓
Utilisateur reçoit notif même app fermée ✅
```

---

## Fichiers importants

| Fichier | Rôle |
|---------|------|
| `src/services/notification-scheduler.ts` | Moteur principal |
| `src/services/notification-schedule-config.ts` | Heures + limites |
| `src/services/prayer-notifications.ts` | Prières dynamiques |
| `src/services/motivational-notifications.ts` | Messages 💖 💪 📱 |
| `src/pages/admin/AdminNotificationScheduler.tsx` | Dashboard admin |
| `public/notification-sw.js` | Web Push backend |
| `src/components/NotificationBell.tsx` | Cloche + liste |

---

## Checklist avant lancer en prod ✅

- [ ] Les 5 messages d'exemple reçus en test ✅
- [ ] Web Push fonctionne sur téléphone (ou Android Chrome)
- [ ] Messages pas trop violents (max 7/jour)
- [ ] Heures correspondent fuseau horaire ciblé
- [ ] Service Worker "activated and running"
- [ ] Pas d'erreurs en Console
- [ ] `runNotificationCheck()` tout en vert

---

**C'est tout! Les notifications tournent silencieusement en arrière-plan.** 🚀

Questions? Voir: [COMPLETE_NOTIFICATIONS_SETUP.md](./COMPLETE_NOTIFICATIONS_SETUP.md)
