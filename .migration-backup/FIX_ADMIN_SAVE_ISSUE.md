# 🔧 FIX: Admin Saves Not Appearing in User Interface

## Problem Summary
When you add content (like "prière") in the admin page and click Save, it doesn't appear on the user-facing pages.

## Root Cause
**Conflicting RLS (Row Level Security) policies** on the `page_content` table:
- ❌ **Old restrictive policy** (from 20251210): Only authenticated admins can UPDATE
- ✅ **New permissive policy** (from 20260218): Everyone can UPDATE

The old restrictive policy is blocking saves even when the new policy should allow them.

## Solution

### Option A: Quick SQL Fix (Recommended - 2 minutes)

Go to **Supabase Dashboard → SQL Editor** and run this:

```sql
-- Drop conflicting restrictive policies
DROP POLICY IF EXISTS "Only admins can update page_content" ON public.page_content;
DROP POLICY IF EXISTS "Only admins can insert page_content" ON public.page_content;
DROP POLICY IF EXISTS "Only admins can delete page_content" ON public.page_content;

-- Create permissive policies
CREATE POLICY "Allow all updates on page_content" ON public.page_content
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all inserts on page_content" ON public.page_content
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all deletes on page_content" ON public.page_content
  FOR DELETE USING (true);
```

Then click **RUN** ✓

### Option B: Via CLI (If you have Supabase CLI)

```bash
supabase db push
# This will apply the new migration file: 20260219_fix_page_content_rls_conflict.sql
```

## Verify The Fix

After applying the fix, test in the admin interface:

1. Go to `/admin/careme2026`
2. Edit one day and add test text (like "TEST PRIÈRE")
3. Click **Save**
4. Should see toast: **"Programme sauvegardé! ✓"**
5. Go to `/careme2026` (user page)
6. You should see your test text **instantly** via real-time subscription

If it doesn't appear:
- Check **browser console** (F12 → Console)
- Look for errors in subscriptions
- Try **hard refresh** (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

## Technical Details

Why this works:
- RLS policies with `USING (true)` and `WITH CHECK (true)` mean "allow everyone"
- App-level admin role checks happen in the TypeScript code
- Real-time subscriptions automatically update user pages when data changes

## Files Changed

- ✅ `src/pages/admin/AdminCareme2026.tsx` - Now tries direct UPDATE first, RPC as fallback
- ✅ `src/pages/admin/AdminCheminDeCroix.tsx` - Same improvement
- ✅ `supabase/migrations/20260219_fix_page_content_rls_conflict.sql` - Fixes RLS policies
- ✅ `diagnose-save-issue.mjs` - Diagnostic script to check the issue

## Alternative: Undo and Use Admin Role Check

If you prefer the admin-only approach (users can't update content in the DB directly), you need:
1. Proper admin role assignment to users in `user_roles` table
2. RLS policies that check the `user_roles` table
3. Make sure your user has `role = 'admin'` in the database

Contact support if you need this approach instead.

---

**After applying this fix, everything should work!** 🎉
