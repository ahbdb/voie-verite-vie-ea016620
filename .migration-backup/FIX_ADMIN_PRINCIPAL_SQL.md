# 🔧 Fix Admin Principal - Manual SQL Steps

## Problem
- ✅ Tu es connecté comme `ahdybau@gmail.com`
- ❌ `admin_principal` n'existe pas dans la base de données (l'enum doit être créé)
- ❌ Le rôle ne peut pas être inséré car l'enum est manquant

## Solution: 3 étapes SQL

### Step 1: Go to Supabase SQL Editor
1. Ouvre: **https://app.supabase.com/project/kaddsojhnkyfavaulrfc/sql/editor**
2. Clique **"New Query"**

### Step 2: Execute Migration 1 (Add enum values)
Copie-colle et **Execute**:

```sql
-- Add admin_principal and moderator to the app_role enum
DO $$
BEGIN
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'admin_principal' BEFORE 'admin';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER TYPE public.app_role ADD VALUE 'moderator' AFTER 'admin';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
END $$;
```

**Expected result:** `Query successful` ✅

### Step 3: Execute Migration 2 (Add the role)
Copie-colle et **Execute**:

```sql
-- Set admin_principal role for ahdybau@gmail.com
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal'::public.app_role, NOW(), NOW()
FROM auth.users
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin_principal'::public.app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
```

**Expected result:** 
```
email: ahdybau@gmail.com
role: admin_principal
```
✅

### Step 4: Refresh & Test
1. Go back to your app
2. **Sign out completely** (⚠️ Important!)
3. **Clear cache**: Ctrl+Shift+Delete → Clear all
4. **Sign back in**
5. Click **"Admin"** in the menu
6. You should now see all 12 admin tabs! 🎉

---

## Why this works:
1. **Step 1** adds `admin_principal` as a valid enum value
2. **Step 2** inserts your role and verifies it's set
3. **Step 4** clears your session so the app recognizes the new role

Done! Let me know when it's working! 🚀
