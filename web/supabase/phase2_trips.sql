-- TripMates Phase 2: trips, matching, join requests, chat.
-- Run AFTER schema.sql, in the Supabase SQL editor.

-- Fix for databases created from the first version of schema.sql:
-- reviews must reference profiles so author names can be embedded.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'reviews_user_id_fkey'
             and confrelid = 'auth.users'::regclass) then
    alter table public.reviews drop constraint reviews_user_id_fkey;
    alter table public.reviews add constraint reviews_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  origin text,
  destination text not null check (char_length(destination) between 2 and 120),
  dest_lat double precision not null check (dest_lat between -90 and 90),
  dest_lng double precision not null check (dest_lng between -180 and 180),
  start_date date not null,
  end_date date not null,
  budget_per_person numeric check (budget_per_person >= 0),
  style text not null default 'mixed'
    check (style in ('budget','comfort','adventure','relaxed','mixed')),
  max_buddies int not null default 4 check (max_buddies between 1 and 20),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists trips_dates_idx on public.trips (end_date, start_date);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  message text,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists trip_messages_idx on public.trip_messages (trip_id, created_at);

-- Helper functions (security definer so RLS policies don't recurse)
create or replace function public.is_trip_owner(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = tid and user_id = auth.uid());
$$;

create or replace function public.is_trip_member(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_trip_owner(tid)
      or exists (select 1 from public.trip_members
                 where trip_id = tid and user_id = auth.uid() and status = 'approved');
$$;

-- Enforce group size on approval
create or replace function public.enforce_trip_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; cnt int;
begin
  if new.status = 'approved' then
    select max_buddies into cap from public.trips where id = new.trip_id;
    select count(*) into cnt from public.trip_members
      where trip_id = new.trip_id and status = 'approved' and user_id <> new.user_id;
    if cnt >= cap then
      raise exception 'This trip is full';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trip_capacity on public.trip_members;
create trigger trip_capacity before insert or update on public.trip_members
  for each row execute function public.enforce_trip_capacity();

alter table public.trips         enable row level security;
alter table public.trip_members  enable row level security;
alter table public.trip_messages enable row level security;

create policy "trips readable" on public.trips for select using (true);
create policy "trips insert own" on public.trips for insert with check (auth.uid() = user_id);
create policy "trips update own" on public.trips for update using (auth.uid() = user_id);
create policy "trips delete own" on public.trips for delete using (auth.uid() = user_id);

create policy "members visible" on public.trip_members for select
  using (status = 'approved' or user_id = auth.uid() or public.is_trip_owner(trip_id));
create policy "members request" on public.trip_members for insert
  with check (user_id = auth.uid() and status = 'pending' and not public.is_trip_owner(trip_id));
create policy "owner decides" on public.trip_members for update
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
create policy "leave or remove" on public.trip_members for delete
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));

create policy "chat read" on public.trip_messages for select using (public.is_trip_member(trip_id));
create policy "chat write" on public.trip_messages for insert
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

-- Realtime for chat (respects RLS)
do $$ begin
  alter publication supabase_realtime add table public.trip_messages;
exception when duplicate_object then null; end $$;
