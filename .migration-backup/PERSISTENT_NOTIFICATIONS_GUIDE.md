# 📬 Guide de Mise en Œuvre du Système de Notifications Persistantes

## ✅ Étape 1: Appliquer les Migrations

Le système de notifications persistantes nécessite les tables suivantes à être créées dans Supabase.

### Option A: Via Supabase Dashboard (Recommandé)

1. Allez à **Supabase Dashboard** → **SQL Editor**
2. Créez une nouvelle requête
3. Copiez le contenu du fichier: `supabase/migrations/20260220_create_notification_system.sql`
4. Cliquez sur **RUN**

### Option B: Via Supabase CLI

```bash
# Assurez-vous que vous êtes dans le répertoire du projet
supabase db push
```

## ✅ Étape 2: Vérifier que les Tables sont Créées

Après avoir appliqué la migration, vérifiez dans Supabase que ces tables existent:

- ✅ `broadcast_notifications` - Pour stocker les notifications envoyées par les admins
- ✅ `user_notifications` - Pour stocker les notifications de chaque utilisateur
- ✅ `notification_settings` - Pour les préférences de notification

Et les fonctions RPC:
- ✅ `send_broadcast_notification()` - Pour envoyer une notification à tous les utilisateurs
- ✅ `mark_notification_read()` - Pour marquer une notification comme lue
- ✅ `mark_notification_viewed()` - Pour marquer une notification comme vue
- ✅ `get_unread_notification_count()` - Pour obtenir le nombre de notifications non lues

## ✅ Étape 3: Accéder à l'Interface Admin

1. Allez à **`/admin`**
2. Dans le menu d'administration, cliquez sur **"Notifications"** avec l'icône 🔔
3. Vous arrivez à la page `/admin/notifications`

## 📝 Étape 4: Envoyer Votre Première Notification

### Onglet "Envoyer une notification"

1. **Titre**: Entrez le titre (ex: "Bonjour à tous!")
2. **Type**: Sélectionnez le type:
   - 👋 Salutation (Bonjour)
   - 🔔 Rappel
   - 📢 Annonce
   - ✨ Mise à jour
3. **Destinataires**: Sélectionnez:
   - "Tous les utilisateurs" - Envoyer à tout le monde
   - "Utilisateurs normaux" - Envoyer aux utilisateurs (pas admins)
   - "Administrateurs" - Envoyer aux admins seulement
4. **Message**: Écrivez votre message
5. Cliquez sur **"Envoyer la notification"**

### Onglet "Historique"

Consultez l'historique de toutes les notifications envoyées.

## 🔔 Comment les Utilisateurs Reçoivent les Notifications

### 1. Cloche de Notifications (Dans l'app)
- Les notifications apparaissent dans la **cloche** en haut à droite
- Elles restent visibles jusqu'à ce que l'utilisateur les marque comme lues
- Un **badge rouge** affiche le nombre de notifications non lues

### 2. Notifications Système (Web Push)
Si l'utilisateur a **accepté les permissions de notification**:
- Les notifications s'affichent comme des **notifications système** (en haut de l'écran)
- Elles restent visibles avec `requireInteraction: true` jusqu'à ce que l'utilisateur clique ou ferme
- La vibration active si disponible sur le téléphone

### 3. Toasts (Messages temporaires)
- Les notifications de type "Salutation" ou "Rappel" affichent aussi un toast temporaire
- Visible pendant 5 secondes

## 🎯 Cas d'Usage

### ✓ Utilisation Recommandée

```
BONJOUR:
Titre: 👋 Bonjour à tous!
Message: Bonne journée! Que cette journée soit remplie de paix et de bénédictions.
Type: Salutation
Destinataires: Tous les utilisateurs

RAPPEL:
Titre: 🔔 Rappel - Carême 2026
Message: N'oublie pas de consulter la lecture du jour!
Type: Rappel
Destinataires: Tous les utilisateurs

ANNONCE:
Titre: 📢 Nouvelle Fonction
Message: La galerie a été mise à jour avec 10 nouvelles images!
Type: Annonce
Destinataires: Tous les utilisateurs
```

## 🧪 Test du Système

Pour tester que tout fonctionne:

1. Connectez-vous à **`/admin/notifications`**
2. Envoyez une notification test:
   - Titre: "Test Notification"
   - Message: "Message de test"
   - Type: Announcement
   - Destinataires: Tous les utilisateurs
3. **Vérifiez dans la cloche** que la notification apparaît
4. **Cliquez sur la notification** pour la marquer comme lue
5. Le badge doit disparaître quand toutes les notifications sont lues

## 📱 Configurations Avancées

### Autoriser Les Notifications Système

Pour que les Web Push fonctionnent:

1. L'application demandera la permission lors de la première visite
2. L'utilisateur peut accepter ou refuser
3. Si accepté, les notifications s'affichent comme des notifications système

### Notification Persistentes (Comme WhatsApp)

Les notifications sont **persistantes** car:
- Elles sont sauvegardées dans la base de données (`user_notifications`)
- Chaque utilisateur a sa propre liste qui persiste
- Elles restent visibles dans la cloche jusqu'à ce qu'elles soient marquées comme lues
- Même si l'application est fermée, les notifications sont gardées
- Quand l'utilisateur revient,  il les voit toujours

## 🔧 Dépannage

### Les notifications n'apparaissent pas?

1. **Vérifiez la migration**: Assurez-vous que la migration a été appliquée à Supabase
   - Allez à **Supabase → SQL Editor**
   - Exécutez: `SELECT * FROM broadcast_notifications LIMIT 1;`
   - Si vous avez une erreur "relation doesn't exist", la migration n'a pas été appliquée

2. **Vérifiez les permissions RLS**: Les RLS policies doivent être correctes
   - Allez à **Supabase → Authentication → Row Level Security**
   - Vérifiez que `broadcast_notifications` et `user_notifications` ont les bonnes policies

3. **Vérifiez la fonction RPC**: `send_broadcast_notification`
   - Allez à **Supabase → SQL Editor**
   - Exécutez: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'send_broadcast_notification';`

### Les notifications système (Web Push) ne s'affichent pas?

1. L'utilisateur doit **accepter la permission** quand l'app demande
2. Certains navigateurs/téléphones peuvent bloquer les notifications
3. Vérifiez dans les **paramètres du téléphone** → **Notifications** → **Votre navigateur**

## 📊 Statistiques

Vous pouvez voir:
- **Nombre de notifications envoyées** dans l'onglet Historique
- **Nombre de notifications non lues** dans le badge de la cloche
- **Timestamp** de chaque notification

## 🎨 Personnalisation

### Ajouter de Nouveaux Types de Notifications

Éditez [src/pages/admin/AdminNotifications.tsx](src/pages/admin/AdminNotifications.tsx):

```tsx
const notificationTypes = [
  { value: 'greeting', label: '👋 Salutation (Bonjour)' },
  { value: 'reminder', label: '🔔 Rappel' },
  { value: 'announcement', label: '📢 Annonce' },
  { value: 'update', label: '✨ Mise à jour' },
  // Ajouter ici:
  { value: 'urgent', label: '🚨 Urgent' },
];
```

###  Changer les Icônes

Éditez [src/components/NotificationBell.tsx](src/components/NotificationBell.tsx):

```tsx
const typeIcons: Record<string, React.ReactNode> = {
  greeting: <MessageCircle className="w-4 h-4 text-yellow-500" />,
  reminder: <AlertCircle className="w-4 h-4 text-orange-500" />,
  announcement: <Info className="w-4 h-4 text-blue-500" />,
  update: <BookOpen className="w-4 h-4 text-green-500" />,
  // Ajouter ici pour 'urgent':
  urgent: <AlertTriangle className="w-4 h-4 text-red-500" />,
};
```

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez la **console du navigateur** (F12 → Console)
2. Vérifiez les **logs Supabase** (Supabase Dashboard → Logs)
3. Vérifiez que la **migration a bien été appliquée**
4. Vérifiez que l'**utilisateur est authentifié**

---

**Système de notifications persistantes complètement fonctionnels!** 🎉
