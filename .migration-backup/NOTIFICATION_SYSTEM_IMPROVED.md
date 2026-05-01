# Système de Notifications Amélioré 🔔

## Vue d'ensemble

Le système de notifications a été complètement refondu pour:
- ✅ **Envoyer les notifications UNE FOIS PAR JOUR** (pas chaque fois qu'on ouvre l'app)
- ✅ **Adapter les messages selon l'heure** (matin, après-midi, soir)
- ✅ **Rendre les notifications VISIBLES et AUDIBLES** (affichées en haut du téléphone)
- ✅ **Fonctionner même si l'app n'est pas ouverte**
- ✅ **Demander les permissions silencieusement** (sans pop-up bloquant)

## Architecture

### 1. Service Worker amélioré (`public/notification-sw.js`)

**Nouveautés:**
- Support des vibrations (`vibrate: [200, 100, 200]`)
- Gestion du paramètre `requireInteraction: true` (l'utilisateur doit cliquer pour fermer)
- Gestion du paramètre `silent: false` (notification audible)
- Gestion des notifications même si l'app n'est pas ouverte
- Routing intelligent des clics pour revenir à la bonne page

### 2. Service de notifications (`src/lib/notification-service.ts`)

**Nouvelles fonctions:**

#### `sendVisibleNotification(payload)`
Envoie une notification **VISIBLE et AUDIBLE** qui:
- S'affiche en haut du téléphone
- Fait du bruit (son de notification)
- Vibre (si supporté)
- Reste visible jusqu'à action de l'utilisateur
- Unique tag pour ne pas fusionner avec d'autres

**Utilisation:**
```typescript
await sendVisibleNotification({
  title: '🌅 Bienvenue!',
  body: 'Bonjour! J\'espère que ta nuit s\'est bien passée.',
  tag: 'welcome-2025-02-16',
  action: 'reminder',
  silent: false
});
```

#### `sendSilentNotification(payload)` (inchangée)
Envoie une notification silencieuse (fond)

### 3. Système de notifications intelligentes (`src/lib/change-notification-system.ts`)

#### `sendDailyWelcomeNotification(userId)`
La star du système! Cette fonction:

1. **Vérifie si une notification a déjà été envoyée aujourd'hui**
   - Utilise `localStorage` avec une clé par jour (format: `YYYY-MM-DD`)
   - Clé: `welcome-notification-sent-{userId}-{YYYY-MM-DD}`

2. **Détecte l'heure et adapte le message:**
   - **Matin (avant 12h):** 🌅 "Bonjour! J'espère que ta nuit s'est bien passée..."
   - **Après-midi (12h-18h):** ☀️ "Bienvenue! J'espère que ta journée se passe bien..."
   - **Soir (après 18h):** 🌙 "Bonsoir! J'espère que ta journée s'est bien passée..."

3. **Envoie une notification VISIBLE et AUDIBLE**
   - Utilise `sendVisibleNotification()` automatiquement
   - Badge, icône, et emoji appropriés

4. **Marque que la notification a été envoyée**
   - Sauvegarde dans `localStorage` pour le jour

**Exemple de résultat:**
```
[Le téléphone fait du bruit! 🔔]
┌─────────────────────────────────┐
│ 🌅 Bienvenue!                    │
│ Bonjour! J'espère que ta nuit    │
│ s'est bien passée...             │
└─────────────────────────────────┘
[Reste visible jusqu'au clic]
```

## Utilisation dans l'app

### Dans `App.tsx`

```typescript
useEffect(() => {
  if (!user) return;

  const initializeNotifications = async () => {
    // Initialiser le système de changements
    const cleanup = await initChangeNotificationSystem(user.id);
    
    // Envoyer une notification de bienvenue INTELLIGENTE une fois par jour
    await sendDailyWelcomeNotification(user.id);

    return cleanup;
  };

  // ... rest of code
}, [user?.id]);
```

## Comportement par jour

### Jour 1 (Lundi 10h)
```
User ouvre l'app
→ Premier appel à sendDailyWelcomeNotification()
→ La clé 'welcome-notification-sent-user123-2025-02-17' n'existe pas
→ L'heure est 10h (matin)
→ Notification VISIBLE: "🌅 Bonjour! J'espère que ta nuit s'est bien passée..."
→ Sauvegarde de la clé dans localStorage
```

### Jour 1 (Lundi 14h - même jour)
```
User ouvre l'app à nouveau
→ Appel à sendDailyWelcomeNotification()
→ La clé 'welcome-notification-sent-user123-2025-02-17' EXISTE
→ Pas de nouvelle notification (elle a déjà été envoyée aujourd'hui)
```

### Jour 2 (Mardi 10h)
```
User ouvre l'app
→ Appel à sendDailyWelcomeNotification()
→ La clé 'welcome-notification-sent-user123-2025-02-17' n'existe plus (autre jour)
→ L'heure est 10h (matin)
→ Nouvelle notification VISIBLE: "🌅 Bonjour! J'espère que ta nuit s'est bien passée..."
→ Sauvegarde de la NOUVELLE clé pour Mardi
```

## Cas d'usage avec heure

### 🌅 Matin (avant 12h)
```
User ouvre l'app à 8h
↓
"🌅 Bienvenue! Bonjour! J'espère que ta nuit s'est bien passée. Bienvenue dans notre communauté!"
```

### ☀️ Après-midi (12h-18h)
```
User ouvre l'app à 15h
↓
"☀️ Bienvenue! Bienvenue! J'espère que ta journée se passe bien!"
```

### 🌙 Soir (après 18h)
```
User ouvre l'app à 20h
↓
"🌙 Bienvenue! Bonsoir! J'espère que ta journée s'est bien passée. Bienvenue!"
```

## Points clés pour le téléphone

1. **S'affiche en haut** ✅
   - Utilise l'API Notification standard
   - Le service worker gère l'affichage
   - Visible sur écran verrouillé

2. **Fait du bruit** ✅
   - `silent: false` dans les options
   - Utilise le son de notification du téléphone

3. **Vibre** ✅
   - `vibrate: [200, 100, 200]`
   - Patterns reconnus par le téléphone

4. **Reste visible** ✅
   - `requireInteraction: true`
   - Ne disparaît pas automatiquement

5. **Même app pas ouverte** ✅
   - Service Worker actif en arrière-plan
   - Affiche les notifications du système

6. **Sans permission bloquante** ✅
   - `Notification.requestPermission()` silencieuse
   - L'app continue même si refusée

## Configurations avancées

### Pour les autres notifications (optionnel)

Si vous voulez rendre d'autres notifications visibles aussi:

```typescript
// Rendre une notification Carême visible
await sendVisibleNotification({
  title: '🙏 Carême Jour 5',
  body: 'Votre méditation du jour vous attend',
  tag: `careme-5`,
  action: 'careme',
  silent: false
});

// Vs silencieuse (par défaut)
await sendSilentNotification({
  title: '🙏 Carême Jour 5',
  body: 'Votre méditation du jour vous attend',
  tag: `careme-5`,
  action: 'careme'
});
```

## Stockage

Les notifications de bienvenue sont trackées avec `localStorage`:
- **Clé:** `welcome-notification-sent-{userId}-{YYYY-MM-DD}`
- **Valeur:** `'true'`
- **Dure:** Jusqu'à minuit (clé change chaque jour)
- **Avantage:** Persiste même si on ferme le navigateur

## Débogage

### Voir les notifications en localStorage
```javascript
// Dans la console
Object.keys(localStorage).filter(k => k.includes('welcome'))
// Résultat: ["welcome-notification-sent-user123-2025-02-17", ...]
```

### Tester avec une autre date
```javascript
// Forcer une nouvelle notification (dév uniquement)
localStorage.removeItem('welcome-notification-sent-user123-2025-02-17');
// Puis recharger l'app → nouvelle notification
```

## Permissions et fallback

- ✅ Si permission déjà accordée → Notification system
- ⏳ Si permission 'default' → Demande silencieuse
- ❌ Si permission refusée → Notification API de fallback (ou toast)

## Résumé des changements

### Fichiers modifiés:
1. **src/lib/notification-service.ts**
   - ✅ Ajout `sendVisibleNotification()`
   - ✅ Commentaires améliorés

2. **src/lib/change-notification-system.ts**
   - ✅ Ajout `sendDailyWelcomeNotification()`
   - ✅ Importation de `sendVisibleNotification`
   - ✅ Système de tracking par jour

3. **src/App.tsx**
   - ✅ Import de `sendDailyWelcomeNotification`
   - ✅ Appel de la nouvelle fonction
   - ✅ Suppression de sessionStorage

4. **public/notification-sw.js**
   - ✅ Support des vibrations
   - ✅ Gestion du `silent`/`requireInteraction`
   - ✅ Amélioration du routing

---

**Résultat final:** L'utilisateur reçoit une notification amicale et personnalisée UNE FOIS PAR JOUR, visible et audible, qui l'accueille selon l'heure! 🎉
