-- Supprimer les politiques existantes pour biblical_readings
drop policy if exists "Anyone can view readings" on public.biblical_readings;
drop policy if exists "Admins can manage readings" on public.biblical_readings;

-- Créer les nouvelles politiques RLS
-- Permettre à tout le monde de lire les lectures bibliques
create policy "Anyone can view readings"
on public.biblical_readings for select
using (true);

-- Permettre aux admins de gérer les lectures
create policy "Admins can manage readings"
on public.biblical_readings for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));
