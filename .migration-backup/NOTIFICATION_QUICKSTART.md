# 🚀 Quick Start: Notifications Persistantes

## ⚡ Démarrage en 3 Étapes

### 1️⃣ Appliquer la Migration (2 min)

Allez à **Supabase Dashboard → SQL Editor**

Collez ce SQL:
```sql
-- Copier le contenu entier de:
-- supabase/migrations/20260220_create_notification_system.sql
```

OU exécutez en CLI:
```bash
supabase db push
```

### 2️⃣ Envoyer Votre Première Notification

1. Allez à `http://localhost:5173/admin/notifications`
2. Remplissez le formulaire:
   - **Titre**: "👋 Bonjour!"
   - **Type**: Salutation
   - **Message**: "Bonjour à tous!"
   - **Destinataires**: Tous les utilisateurs
3. Cliquez **"Envoyer la notification"**

### 3️⃣ Tester la Réception

- Ouvrez un autre onglet en tant qu'utilisateur normal
- Vous verrez la notification dans la **cloche 🔔** en haut à droite
- Elle restera visible jusqu'à ce que l'utilisateur la marque comme lue

## 📋 Types de Notifications

| Type | Icône | Cas d'Usage |
|------|-------|-----------|
| Salutation | 👋 | Bonjour, bonne journée |
| Rappel | 🔔 | Rappels importants |
| Annonce | 📢 | Nouvelles features |
| Mise à jour | ✨ | Updates du système |

## 🎯 Exemples

### Bonjour Quotidien
```
Titre: 👋 Bonjour à tous!
Message: Que cette journée soit remplie de paix et de bénédictions.
Type: Salutation
Destinataires: Tous
```

### Rappel d'Activité
```
Titre: 🔔 Carême 2026
Message: N'oublie pas la lecture du jour!
Type: Rappel
Destinataires: Tous
```

### Nouvelle Feature
```
Titre: 📢 Galerie Mise à Jour
Message: Découvrez 20 nouvelles images magnifiques!
Type: Annonce
Destinataires: Tous
```

## ✨ Caractéristiques

✅ Notifications **persistantes** (comme WhatsApp)
✅ **Web Push** système si autorisé par l'utilisateur  
✅ **Synchronisation en temps réel**
✅ **Toasts** temporaires pour certains types
✅ **Badge** avec compteur de non-lues
✅ **Historique** de toutes les notifications

## 🛠️ Dépannage

### Les notifications n'apparaissent pas?

1. **Vérifiez la migration**:
   ```sql
   SELECT * FROM broadcast_notifications LIMIT 1;
   ```
   Si erreur, la migration n'a pas été appliquée.

2. **Vérifiez un autre onglet**:
   Ouvrez un onglet différent pour voir les notifications.

3. **Vérifiez l'auth**:
   L'utilisateur doit être connecté pour recevoir les notifications.

### Les Web Push ne s'affichent pas?

Cela nécessite les permissions. L'app demandera automatiquement.

## 📱 URL Importante

- **Admin Notifications**: `http://localhost:5173/admin/notifications`
- **Docs Complètes**: Voir `PERSISTENT_NOTIFICATIONS_GUIDE.md`
- **Arch Complète**: Voir `NOTIFICATION_SYSTEM_COMPLETE.md`

---

C'est tout ! Commencez à envoyer des notifications maintenant 🎉
