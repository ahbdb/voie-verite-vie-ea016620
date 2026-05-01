# 🔐 Get Service Role Key & Setup Admin

## Step 1: Get your Service Role Key (30 seconds)

1. **Open:** https://app.supabase.com/project/kaddsojhnkyfavaulrfc/settings/api
2. **Find** the section "Project API keys"
3. **Look for** "service_role" (the second big key - NOT the "anon" one)
4. **Click** the eye icon to reveal it
5. **Copy** the entire key

## Step 2: Paste it here (literally copy-paste the command)

Replace `YOUR_KEY_HERE` with the key you just copied:

```bash
export SUPABASE_SERVICE_ROLE_KEY="YOUR_KEY_HERE"
bash setup-service.sh
```

## That's it! ✅

The script will:
- ✅ Create your user account (ahdybau@gmail.com)
- ✅ Generate a password for first login
- ✅ Set your role to admin_principal
- ✅ Show you everything in the terminal

Then sign in and access the Admin section! 🎉

---

## 🆘 Can't find the key?

**Service Role Key Location:**
- https://app.supabase.com
- → Select your project
- → Settings (bottom left) → API
- → It's labeled "service_role"
- → It's listed BELOW the "anon" key
- → It starts with `eyJhbGci...` (very long)

**Why do I need it?**
Because only the service role key can create new user accounts in Supabase. The anon key can only read public data.

---

## Running the setup:

```bash
cd /workspaces/voie-verite-vie
export SUPABASE_SERVICE_ROLE_KEY="your-actual-key"
bash setup-service.sh
```

Done! 🚀
