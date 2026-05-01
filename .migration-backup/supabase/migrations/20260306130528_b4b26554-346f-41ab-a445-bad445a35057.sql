-- Fix notifications RLS for admin_principal and admin broadcast use-cases
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "System can manage notifications" ON public.notifications;
CREATE POLICY "System can manage notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));