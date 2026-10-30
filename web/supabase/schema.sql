-- TripMates Phase 1 schema. Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  display_name text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text,
  category text not null default 'offbeat'
    check (category in ('beach','mountain','trek','food','city','culture','nature','stay','offbeat')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  best_season text,
  how_to_reach text,
  tips text,
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists places_created_idx on public.places (created_at desc);
create index if not exists places_geo_idx on public.places (lat, lng);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5),
  pros text,
  cons text,
  price_paid numeric check (price_paid >= 0),
  price_note text,          -- e.g. "auto from station"
  currency text default 'INR',
  value_rating int check (value_rating between 1 and 5),
  safety_rating int check (safety_rating between 1 and 5),
  visited_on date,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create table if not exists public.saves (
  user_id uuid not null references auth.users on delete cascade,
  place_id uuid not null references public.places on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create or replace view public.place_stats as
select p.id as place_id,
       count(r.id)::int as review_count,
       round(avg(r.rating)::numeric, 1) as avg_rating
from public.places p
left join public.reviews r on r.place_id = p.id
group by p.id;

-- Auto-create a profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.places   enable row level security;
alter table public.reviews  enable row level security;
alter table public.saves    enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "places readable" on public.places for select using (true);
create policy "places insert own" on public.places for insert with check (auth.uid() = user_id);
create policy "places update own" on public.places for update using (auth.uid() = user_id);
create policy "places delete own" on public.places for delete using (auth.uid() = user_id);

create policy "reviews readable" on public.reviews for select using (true);
create policy "reviews insert own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews update own" on public.reviews for update using (auth.uid() = user_id);
create policy "reviews delete own" on public.reviews for delete using (auth.uid() = user_id);

create policy "saves read own" on public.saves for select using (auth.uid() = user_id);
create policy "saves insert own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves delete own" on public.saves for delete using (auth.uid() = user_id);

grant select on public.place_stats to anon, authenticated;
