# ⚡ ADMIN SETUP - 2 MINUTES

**You:** ahdybau@gmail.com  
**Goal:** Basic admin access to the app

---

## 🚀 THE FASTEST WAY (Copy-Paste, 2 min)

### 1️⃣ Sign Up First (If not already done)
Go to your app and sign up with **ahdybau@gmail.com**
- Create password
- Verify email
- Done ✅

### 2️⃣ Copy-Paste SQL (1 minute)
1. Open: **https://app.supabase.com/project/kaddsojhnkyfavaulrfc/sql/editor**
2. Click **"New Query"**
3. **Copy-paste everything below:**

```sql
-- Auto-setup admin_principal for ahdybau@gmail.com
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users 
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'ahdybau@gmail.com')
  AND role IN ('admin', 'moderator');

INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin_principal'::app_role, NOW(), NOW()
FROM auth.users
WHERE email = 'ahdybau@gmail.com'
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin_principal')
ON CONFLICT (user_id, role) DO NOTHING;

SELECT u.email, ur.role FROM auth.users u 
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ahdybau@gmail.com';
```

4. **Click "Execute"** ▶️
5. **You should see your email + "admin_principal" role** ✅

### 3️⃣ Refresh & Login (1 minute)
1. Go back to your app
2. **Sign out completely** (Important!)
3. **Clear cache:** Ctrl+Shift+Delete → Clear all
4. **Sign back in** with ahdybau@gmail.com
5. **Click "Admin"** in menu
6. 🎉 You now have full admin access!

---

## ❌ What's NOT Working?

**Can't sign up?**
- Need service role key (contact admin)

**SQL fails?**
- Copy-paste exactly as shown above
- Make sure you're in the SQL editor

**Admin tab not showing?**
- Clear browser cache fully (Ctrl+Shift+Delete)
- Sign out and back in
- Check email in console: `console.log(user)`

**Still broken?**
- Screenshot the error
- Run in Terminal: `echo $VITE_SUPABASE_URL`

---

## 🤖 Automated Way (If you have service role key)

Set environment variable and run:
```bash
SUPABASE_SERVICE_KEY="your-key" bash setup-admin-full.sh
```

---

**Done?** You should now see the Admin section with all 12 tabs! 🎉
