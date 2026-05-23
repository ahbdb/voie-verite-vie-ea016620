# Admin User Setup Instructions

## Overview
This document provides step-by-step instructions to set up the primary admin user (ahdybau@gmail.com) in Supabase.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create User in Authentication
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** > **Users**
3. Click **"Invite"** or **"Create user"**
4. Enter credentials:
   - **Email**: `ahdybau@gmail.com`
   - **Password**: `ADBleke@14092001`
   - Confirm password
5. Click **"Create user"**

### Step 2: Verify Profile Was Created
1. Go to **SQL Editor**
2. Run this query to verify the profile was created:
```sql
SELECT * FROM public.profiles 
WHERE email = 'ahdybau@gmail.com';
```
3. Note the `id` (user_id) returned

### Step 3: Grant Admin Role
1. In **SQL Editor**, run:
```sql
-- Check current role
SELECT * FROM public.user_roles 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com');

-- Update role to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com');
```

### Step 4: Verify Admin Access
1. Log in to the application with:
   - Email: `ahdybau@gmail.com`
   - Password: `ADBleke@14092001`
2. You should see the **Admin** option in the navigation
3. All 12 admin tabs should be accessible

## Method 2: Using SQL Only (for Supabase Developers)

If you have direct SQL access to your Supabase database:

```sql
-- Get current user count
SELECT COUNT(*) FROM auth.users;

-- View existing users
SELECT id, email FROM auth.users;

-- View existing profiles
SELECT id, email FROM public.profiles;

-- View user roles
SELECT * FROM public.user_roles;

-- After creating user via dashboard, update role:
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com');

-- Verify
SELECT ur.user_id, ur.role, p.email 
FROM public.user_roles ur 
JOIN public.profiles p ON ur.user_id = p.id 
WHERE p.email = 'ahdybau@gmail.com';
```

## Method 3: Using Supabase CLI

If you have the Supabase CLI installed locally:

### Step 1: Link to Project
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 2: Run Migrations
```bash
cd /workspaces/voie-verite-vie
supabase migration up
```

### Step 3: Create User (still needs dashboard)
Unfortunately, user creation via CLI is not directly supported. Use the dashboard method above.

### Step 4: Grant Admin Role via CLI
```bash
supabase db push --dry-run  # Preview changes
supabase db execute "UPDATE public.user_roles SET role = 'admin' WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com');"
```

## Verification Steps

### Test 1: Login Access
```bash
# Navigate to: http://localhost:5173 (or your app URL)
# Click "Se connecter"
# Use credentials:
# - Email: ahdybau@gmail.com
# - Password: ADBleke@14092001
```

### Test 2: Admin Page Access
1. After login, check if "Admin" appears in navigation menu
2. Click on Admin tab
3. You should see:
   - 12 tabs (Tableau de bord, Admins, Utilisateurs, etc.)
   - Dashboard statistics
   - User management interface
   - Content management options

### Test 3: Database Verification
Run in Supabase SQL Editor:
```sql
-- Verify admin user exists
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email = 'ahdybau@gmail.com';

-- Should return one row with role = 'admin'
```

## Troubleshooting

### Problem: Profile not created after user creation
**Solution**: Supabase trigger should auto-create profile. If not:
```sql
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com'),
  'ahdybau@gmail.com',
  'Admin User'
);
```

### Problem: Admin tab doesn't appear
**Possible causes**:
1. User not in `user_roles` table with role='admin'
2. RLS policies blocking access
3. Browser cache - try incognito/private window
4. Authentication not refreshed - sign out and back in

**Solution**:
```sql
-- Check if user_roles entry exists
SELECT * FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');

-- If missing, insert it
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com'),
  'admin'
)
ON CONFLICT DO NOTHING;
```

### Problem: Can't login
**Possible causes**:
1. User not created in auth.users
2. Email not confirmed (if confirmation enabled)
3. Typo in email/password

**Solution**:
- Verify email is exactly: `ahdybau@gmail.com`
- Verify password is exactly: `ADBleke@14092001`
- In Supabase dashboard, check if user exists in Authentication > Users

### Problem: Getting permission denied errors
**Solution**: RLS policies might be blocking. Check in SQL:
```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- Verify user can read own roles
SELECT * FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com');
```

## Additional Admin Management

### Adding Another Admin Later
1. Make sure the user exists (has created an account)
2. Log in as `ahdybau@gmail.com`
3. Go to **Admin** > **Admins** tab
4. Enter the user's email address
5. Click **Ajouter**

### Removing Admin Rights
1. Log in as `ahdybau@gmail.com`
2. Go to **Admin** > **Admins** tab
3. Find the admin user
4. Click trash icon
5. Confirm deletion

## Security Notes

⚠️ **Important**:
1. Change the admin password after initial setup
2. Use a strong, unique password
3. Don't share the credentials
4. Monitor who has admin access regularly
5. Audit admin actions via logs (if available)
6. Consider setting up 2FA on the admin account

## File References

The following files were created/modified for admin functionality:

**New Components**:
- `src/components/admin/AdminAbout.tsx`
- `src/components/admin/AdminActivities.tsx`
- `src/components/admin/AdminGallery.tsx`
- `src/components/admin/AdminPrayerForum.tsx`
- `src/components/admin/AdminManagement.tsx`

**Modified Files**:
- `src/pages/Admin.tsx` - Added imports and tabs for new components

**Database Migrations**:
- `supabase/migrations/20251210_add_content_management_tables.sql`

**Documentation**:
- `ADMIN_IMPLEMENTATION.md` - Comprehensive implementation details
- `ADMIN_USER_SETUP.md` - This file

## Next Steps

After setting up the admin user:

1. ✅ Test login with admin credentials
2. ✅ Verify Admin page is accessible
3. ✅ Try creating an activity/gallery item
4. ✅ Test adding another admin user
5. ✅ Review all 12 admin tabs
6. ✅ Test content moderation features (prayer forum)

## Support

For issues or questions:
1. Check Supabase logs in dashboard
2. Review browser console for JavaScript errors
3. Verify RLS policies in SQL Editor
4. Check that all migrations ran successfully

---

**Created**: 2024-12-10
**Status**: Ready for production deployment
