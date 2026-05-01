-- Update RLS policies to use granular permissions system

-- ============================================================================
-- BIBLICAL_READINGS - Permission-based access
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage readings" ON public.biblical_readings;

CREATE POLICY "Users can manage readings with permission"
ON public.biblical_readings FOR ALL
TO authenticated
USING (
  public.is_main_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'manage_readings'::public.user_permission)
);

-- ============================================================================
-- CONTACTS - Permission-based access
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contacts;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contacts;

CREATE POLICY "Users can view and manage contacts with permission"
ON public.contacts FOR SELECT
TO authenticated
USING (
  public.is_main_admin(auth.uid())
  OR public.has_any_permission(auth.uid(), ARRAY['manage_contacts'::public.user_permission, 'view_contacts'::public.user_permission])
);

CREATE POLICY "Users can delete contacts with permission"
ON public.contacts FOR DELETE
TO authenticated
USING (
  public.is_main_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'manage_contacts'::public.user_permission)
);

-- ============================================================================
-- NOTIFICATIONS - Permission-based access
-- ============================================================================
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

CREATE POLICY "Users can create notifications with permission"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.is_main_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'create_notifications'::public.user_permission)
  OR auth.uid() = user_id
);

-- ============================================================================
-- Allow admins to view analytics if they have permission
-- ============================================================================
-- This would be applied to an analytics table if it exists
-- Currently this is placeholder for future analytics access control
