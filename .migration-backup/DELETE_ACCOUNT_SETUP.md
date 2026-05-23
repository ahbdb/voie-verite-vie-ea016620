# ⚠️ SETUP REQUIRED - Suppression de Compte

## Étape 1: Appliquer la migration SQL

### Via Supabase Dashboard (2 min)

1. Ouvrez https://supabase.com/dashboard
2. Sélectionnez le projet **voie-verite-vie**
3. Allez à **SQL Editor** (menu gauche)
4. Cliquez **New Query**
5. **COPIER-COLLER** le contenu du fichier [SETUP_DELETE_ACCOUNT.sql](SETUP_DELETE_ACCOUNT.sql)
6. Cliquez **RUN**

Vous verrez: `Success. No rows returned.`

### OU via CLI (si vous avez les clés)

```bash
cd /workspaces/voie-verite-vie
supabase db push
```

---

## Étape 2: Tester la suppression

1. Allez à **Paramètres** dans l'application
2. Scrollez vers le bas → **Zone Dangereuse**
3. Cliquez **Supprimer mon compte**
4. Confirmez
5. ✅ Compte supprimé → Vous ne pouvez plus vous connecter

---

## C'est quoi le SQL qu'on exécute?

```sql
create or replace function public.hard_delete_auth_user(target_user_id uuid)
returns json as $$
begin
  if auth.uid() != target_user_id then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;
  
  delete from public.user_roles where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
  
  return json_build_object('status', 'success', 'message', 'User completely deleted');
exception when others then
  return json_build_object('status', 'error', 'message', sqlerrm);
end;
$$ language plpgsql security definer;

grant execute on function public.hard_delete_auth_user(uuid) to authenticated;
```

### Qu'est-ce que ça fait?

✅ Supprime le profil utilisateur  
✅ Supprime les rôles de l'utilisateur  
✅ **SUPPRIME L'UTILISATEUR DE `auth.users`** (le plus important!)  
✅ Rend impossible la reconnexion

---

## ❌ Problème après suppression?

Si vous ne pouvez TOUJOURS pas vous connecter après suppression, c'est qu'il y a un problème:
1. Vérifiez que le SQL s'est exécuté correctement (pas d'erreur dans Supabase)
2. Effacez le cache du navigateur (Ctrl+Shift+Delete)
3. Testez avec un nouvel email/mdp dans une fenêtre privée

---

**STATUS**: ⏳ En attente d'application du SQL
