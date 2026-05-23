# 🚀 APPLIQUER LA MIGRATION: Système de Notifications

## ⚡ Méthode Plus Rapide (5 minutes)

### Étape 1: Allez à Supabase Dashboard

```
https://supabase.com/dashboard
```

### Étape 2: Sélectionnez Votre Projet

Cliquez sur votre projet `voie-verite-vie` dans la liste.

### Étape 3: Ouvrez SQL Editor

Dans le menu de gauche → **SQL Editor** → **New Query**

### Étape 4: Copiez le SQL

Ouvrez le fichier: `APPLY_NOTIFICATION_MIGRATION.sql`

Copiez-collez **TOUT le contenu** dans l'éditeur SQL de Supabase.

### Étape 5: Exécutez

Cliquez sur le bouton **RUN** (ou Ctrl+Enter)

```
✓ La migration s'applique instantanément!
```

## ✅ Vérifier que Ça Marche

Une fois la migration appliquée, vous verrez en bas de la page:

```
broadcast_notifications    0
user_notifications        0  
notification_settings     0
```

Ces nombres confirment que les tables sont créées!

## 🎯 Prochaines Étapes

1. Allez à `/admin/notifications`
2. Remplissez le formulaire
3. Cliquez sur **"Envoyer la notification"**
4. Ouvrez un autre onglet (ou ferrez/ouvrez l'app)
5. Vous verrez la notification dans la cloche 🔔

## 📋 Contenu de la Migration

Le fichier `APPLY_NOTIFICATION_MIGRATION.sql` crée:

✅ **3 Tables:**
- `broadcast_notifications` - Notification créée par admin
- `user_notifications` - Notification reçue par chaque utilisateur
- `notification_settings` - Préférences de l'utilisateur

✅ **5 Index:** Pour la performance

✅ **3 Fonctions RPC:**
- `send_broadcast_notification()` - Envoyer à tous/certains
- `mark_notification_read()` - Marquer comme lue
- Autres utilitaires

✅ **RLS Policies:** Sécurité

## ❓ Si Ça Ne Fonctionne Pas

### Error: "already exists"
C'est normal! Cela veut dire que les tables existent déjà.
✓ La migration est complète.

### Error: "permission denied"
Vous avez besoin de droits admin sur Supabase.
1. Allez à **Settings → Invite Team Members**
2. Assurez-vous d'avoir les permissions complètes

### Rien ne s'affiche
- Essayez un hard refresh: **Ctrl+Shift+R** (Windows) ou **Cmd+Shift+R** (Mac)
- Attendez 5-10 secondes
- Ouvrez une notification dans la cloche

## 🎉 C'est Tout!

Une fois la migration appliquée, le système de notifications persistantes est **fully fonctionnel**!

Prendre plaisir à envoyer des notifications 📬✨
