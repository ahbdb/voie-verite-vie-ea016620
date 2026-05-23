-- Créer le type enum pour les rôles
create type public.app_role as enum ('admin', 'user');

-- Table profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamp with time zone default now()
);

-- Table user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Fonction pour vérifier les rôles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Table des lectures bibliques (programme complet sur 358 jours)
create table public.biblical_readings (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null unique,
  date date not null,
  month integer not null,
  year integer not null,
  books text not null,
  chapters text not null,
  chapters_count integer not null,
  type text not null,
  comment text,
  created_at timestamp with time zone default now()
);

-- Table pour le progrès de lecture des utilisateurs
create table public.user_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reading_id uuid references public.biblical_readings(id) on delete cascade not null,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (user_id, reading_id)
);

-- Tables pour l'IA
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.biblical_readings enable row level security;
alter table public.user_reading_progress enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Policies for user_roles
create policy "Users can view their own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage all roles"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Policies for biblical_readings
create policy "Anyone can view readings"
on public.biblical_readings for select
to authenticated
using (true);

create policy "Admins can manage readings"
on public.biblical_readings for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Policies for user_reading_progress
create policy "Users can view their own progress"
on public.user_reading_progress for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can manage their own progress"
on public.user_reading_progress for all
to authenticated
using (auth.uid() = user_id);

-- Policies for ai_conversations
create policy "Users can view their own conversations"
on public.ai_conversations for select
to authenticated
using (auth.uid() = user_id or user_id is null);

create policy "Users can create conversations"
on public.ai_conversations for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own conversations"
on public.ai_conversations for update
to authenticated
using (auth.uid() = user_id or user_id is null);

create policy "Users can delete their own conversations"
on public.ai_conversations for delete
to authenticated
using (auth.uid() = user_id or user_id is null);

-- Policies for ai_messages
create policy "Users can view messages in their conversations"
on public.ai_messages for select
to authenticated
using (
  exists (
    select 1 from public.ai_conversations
    where id = conversation_id
    and (user_id = auth.uid() or user_id is null)
  )
);

create policy "Users can create messages"
on public.ai_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.ai_conversations
    where id = conversation_id
    and (user_id = auth.uid() or user_id is null)
  )
);

-- Trigger pour créer un profil automatiquement
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes
create index idx_biblical_readings_day on public.biblical_readings(day_number);
create index idx_biblical_readings_date on public.biblical_readings(date);
create index idx_biblical_readings_month on public.biblical_readings(month);
create index idx_user_progress_user on public.user_reading_progress(user_id);
create index idx_user_progress_reading on public.user_reading_progress(reading_id);
create index idx_ai_conversations_user on public.ai_conversations(user_id);
create index idx_ai_messages_conversation on public.ai_messages(conversation_id);