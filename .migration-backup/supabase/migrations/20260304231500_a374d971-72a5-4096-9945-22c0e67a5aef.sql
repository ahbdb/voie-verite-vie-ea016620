-- MVP visio maison réservé aux administrateurs
create table if not exists public.video_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null,
  status text not null default 'waiting',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.video_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.video_rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  is_active boolean not null default true,
  joined_at timestamp with time zone not null default now(),
  left_at timestamp with time zone,
  unique(room_id, user_id)
);

create table if not exists public.video_room_signals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.video_rooms(id) on delete cascade,
  sender_id uuid not null,
  recipient_id uuid,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_video_rooms_created_by on public.video_rooms(created_by);
create index if not exists idx_video_rooms_status on public.video_rooms(status);
create index if not exists idx_video_room_participants_room_id on public.video_room_participants(room_id);
create index if not exists idx_video_room_participants_user_id on public.video_room_participants(user_id);
create index if not exists idx_video_room_signals_room_id on public.video_room_signals(room_id);
create index if not exists idx_video_room_signals_recipient_id on public.video_room_signals(recipient_id);
create index if not exists idx_video_room_signals_created_at on public.video_room_signals(created_at desc);

alter table public.video_rooms enable row level security;
alter table public.video_room_participants enable row level security;
alter table public.video_room_signals enable row level security;

create policy "Admins can view video rooms"
on public.video_rooms
for select
using (public.is_admin(auth.uid()));

create policy "Admins can create video rooms"
on public.video_rooms
for insert
with check (public.is_admin(auth.uid()) and auth.uid() = created_by);

create policy "Admins can update video rooms"
on public.video_rooms
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admins can delete video rooms"
on public.video_rooms
for delete
using (public.is_admin(auth.uid()));

create policy "Admins can view room participants"
on public.video_room_participants
for select
using (
  public.is_admin(auth.uid())
  and exists (
    select 1
    from public.video_rooms vr
    where vr.id = video_room_participants.room_id
  )
);

create policy "Admins can join rooms as themselves"
on public.video_room_participants
for insert
with check (
  public.is_admin(auth.uid())
  and auth.uid() = user_id
  and exists (
    select 1
    from public.video_rooms vr
    where vr.id = video_room_participants.room_id
  )
);

create policy "Admins can update their participant state"
on public.video_room_participants
for update
using (
  public.is_admin(auth.uid())
  and auth.uid() = user_id
)
with check (
  public.is_admin(auth.uid())
  and auth.uid() = user_id
);

create policy "Admins can remove participants"
on public.video_room_participants
for delete
using (public.is_admin(auth.uid()));

create policy "Admins can view room signals"
on public.video_room_signals
for select
using (
  public.is_admin(auth.uid())
  and exists (
    select 1
    from public.video_rooms vr
    where vr.id = video_room_signals.room_id
  )
);

create policy "Admins can send room signals"
on public.video_room_signals
for insert
with check (
  public.is_admin(auth.uid())
  and auth.uid() = sender_id
  and exists (
    select 1
    from public.video_rooms vr
    where vr.id = video_room_signals.room_id
  )
);

create policy "Admins can delete room signals"
on public.video_room_signals
for delete
using (public.is_admin(auth.uid()));

alter publication supabase_realtime add table public.video_rooms;
alter publication supabase_realtime add table public.video_room_participants;
alter publication supabase_realtime add table public.video_room_signals;