# Système de Permissions Granulaires Pour Admin

## Aperçu

Vous pouvez maintenant définir des **permissions personnalisées** pour chaque Admin et Modérateur au moment de leur nomination. 

Au lieu d'avoir des rôles figés (Admin = accès complet), chaque personne peut avoir **exactement** les permissions dont elle a besoin.

---

## Comment Ça Marche

### 1. **Page de Gestion des Utilisateurs** (AdminUsers.tsx)

Étapes:
1. Allez à **Admin** → **Gestion des Utilisateurs**
2. Sélectionnez un utilisateur normal (role: "Utilisateur")
3. Cliquez sur le **Select dropdown** pour lui assigner un rôle:
   - **Modérateur**: Accès limité, lecture surtout
   - **Admin**: Accès complet à la gestion du contenu
   - **Admin Principal**: Vous (accès total)

4. Si vous assignez **Admin** ou **Modérateur**, un **bouton ⚙️ (Settings)** apparaît
5. Cliquez sur ce bouton pour ouvrir le **dialog des permissions**
6. Sélectionnez les permissions que vous voulez lui donner:
   - ✓ Gérer les lectures bibliques
   - ✓ Gérer les prières
   - ✓ Gérer la galerie
   - ✓ Voir les contacts (sans supprimer)
   - etc...

### 2. **Liste des Permissions Disponibles**

#### 📚 **Contenu** (Content Management)
- `manage_readings` - Gérer les lectures bibliques
- `manage_prayers` - Gérer les prières
- `manage_gallery` - Gérer la galerie
- `manage_activities` - Gérer les activités
- `manage_faq` - Gérer la FAQ
- `manage_about` - Gérer la page À propos
- `moderate_content` - Modérer et éditer les contenus

#### 👥 **Utilisateurs** (User Management)
- `manage_users` - Gérer les utilisateurs (créer, modifier, supprimer)

#### 💬 **Communications**
- `manage_contacts` - Voir ET gérer (supprimer) les messages de contact
- `view_contacts` - Voir les contacts (lecture seule)
- `create_notifications` - Créer et envoyer des notifications

#### 📊 **Analytics**
- `view_analytics` - Voir les statistiques et analytics

---

## Exemples Pratiques

### Exemple 1: Modérateur de Contenu
**Rôle**: Modérateur  
**Permissions**:
✓ `moderate_content`  
✓ `manage_readings`  
✓ `view_contacts`

**Résultat**: Peut modérer les contenus et gérer les lectures, mais ne peut pas supprimer les utilisateurs ni gérer les contacts.

### Exemple 2: Admin Partiel
**Rôle**: Admin  
**Permissions**:
✓ `manage_readings`  
✓ `manage_gallery`  
✓ `create_notifications`

**Résultat**: Peut gérer SEULEMENT les lectures et la galerie, mais ne peut pas toucher aux prières, utilisateurs, ou contacts.

### Exemple 3: Manager de Communications
**Rôle**: Admin  
**Permissions**:
✓ `manage_contacts`  
✓ `create_notifications`

**Résultat**: Gère tous les messages et envoie les notifications, mais ne peut pas modifier les contenus.

---

## Architecture Technique

### Nouvelle Table: `user_permissions`

```sql
Table: public.user_permissions
├── id (uuid)
├── user_id (references auth.users)
├── permission (enum: user_permission)
├── granted_at (timestamp)
└── granted_by (references auth.users)
```

### Nouvelles Fonctions RLS

| Fonction | Utilité |
|----------|---------|
| `has_permission(user_id, permission)` | Vérifie si un utilisateur a UNE permission spécifique |
| `has_any_permission(user_id, permissions[])` | Vérifie si un utilisateur a AU MOINS UNE permission de la liste |
| `get_user_permissions(user_id)` | Retourne toutes les permissions d'un utilisateur |

### RLS Policies Mises à Jour

- **biblical_readings**: Utilise `manage_readings` permission
- **contacts**: Utilise `manage_contacts` ou `view_contacts` permissions
- **notifications**: Utilise `create_notifications` permission
- **user_roles**: SEULEMENT admin_principal peut modifier les rôles
- **user_permissions**: SEULEMENT admin_principal peut modifier les permissions

---

## SQL À Exécuter

Vous devez exécuter **2 migrations** dans Supabase SQL Editor:

### Migration 1: Créer la table user_permissions
Fichier: `20260216_user_permissions.sql`

```sql
-- Copy the entire content from the migration file
-- This creates:
-- - enum user_permission
-- - table user_permissions
-- - RLS policies
-- - helper functions
```

### Migration 2: Mettre à jour les RLS policies
Fichier: `20260216_permission_based_rls.sql`

```sql
-- Copy the entire content from the migration file
-- This updates the RLS policies to use permissions instead of just roles
```

---

## Vérification Après Installation

1. Allez à **Admin** → **Gestion des Utilisateurs**
2. Assignez un utilisateur en tant qu'Admin
3. Cliquez sur le bouton ⚙️ qui apparaît
4. Vous devriez voir un dialog avec les permissions à cocher
5. Cochez quelques permissions et cliquez "Enregistrer les permissions"
6. Rechargez la page - les permissions doivent être sauvegardées

---

## Notes Importantes

⚠️ **Permissions = Accès à la Modification**

- Si un utilisateur a `manage_readings`, il peut MODIFIER les lectures
- S'il a SEULEMENT `view_contacts`, il observe mais ne peut rien toucher
- Admin Principal (`admin_principal`) a TOUTES les permissions par défaut

⚠️ **Rôles vs Permissions**

- **Rôle** = niveau hierarchique (admin_principal > admin > moderator > user)
- **Permission** = action spécifique que l'utilisateur peut faire
- Un utilisateur doit AVOIR UN RÔLE pour avoir des permissions

---

## Dépannage

**Q: Le bouton ⚙️ n'apparaît pas**  
A: Vérifiez que l'utilisateur a un rôle Admin ou Modérateur (pas "Utilisateur")

**Q: Je ne peux pas sauvegarder les permissions**  
A: Vérifiez que la migration `20260216_user_permissions.sql` a été exécutée avec succès

**Q: Un utilisateur ne peut pas accéder aux pages adminmalgré les permissions**  
A: Assurez-vous que la migration `20260216_permission_based_rls.sql` a été exécutée aussi

---

## Prochaines Étapes

1. ✅ Exécutez les 2 migrations SQL
2. ✅ Testez le système en assignant des permissions
3. ✅ Vérifiez que les utilisateurs peuvent/ne peuvent pas accéder aux pages admin selon leurs permissions
4. ✅ Documentez vos politiques de permissions pour l'équipe

Besoin d'aide? Consultez les logs de la console du navigateur pour voir les erreurs RLS.

---

## Appliquer toutes les réparations RLS / roles (commande rapide)

Si tu veux appliquer **toutes** les corrections RLS et rôles préparées dans ce dépôt en une seule exécution :

- Manuellement : ouvre **Supabase → SQL Editor**, colle `supabase/migrations/20260216_apply_admin_fixes.sql` et exécute.
- Automatiquement (si tu as la SERVICE ROLE key) :
  1. export SUPABASE_SERVICE_ROLE_KEY="<ta_service_key>"
  2. npm run apply:admin-fixes

Le script essaiera d'exécuter la migration via la RPC `exec_sql` si elle existe, sinon il affichera le SQL pour exécution manuelle.

