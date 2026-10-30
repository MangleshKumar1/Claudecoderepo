-- TripMates Phase 4: itineraries (manual + AI-generated) and AI usage log.
-- Run AFTER schema.sql, phase2_trips.sql and phase3_safety.sql. Run once.

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  trip_id uuid references public.trips on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  destination text not null check (char_length(destination) between 2 and 120),
  dest_lat double precision check (dest_lat between -90 and 90),
  dest_lng double precision check (dest_lng between -180 and 180),
  summary text check (summary is null or char_length(summary) <= 1000),
  extra_notes text check (extra_notes is null or char_length(extra_notes) <= 3000),  -- safety + packing tips
  start_date date,
  num_days int not null default 1 check (num_days between 1 and 30),
  budget_per_person numeric check (budget_per_person >= 0),
  is_public boolean not null default false,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists itineraries_user_idx on public.itineraries (user_id, created_at desc);
create index if not exists itineraries_trip_idx on public.itineraries (trip_id);
create index if not exists itineraries_public_idx on public.itineraries (is_public, created_at desc);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries on delete cascade,
  day int not null check (day between 1 and 30),
  position int not null default 0,
  time_of_day text not null default 'morning' check (time_of_day in ('morning','afternoon','evening','night')),
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 1500),
  est_cost numeric check (est_cost >= 0),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  place_id uuid references public.places on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists itinerary_items_idx on public.itinerary_items (itinerary_id, day, position);

-- One row per AI request, used for the daily cap
create table if not exists public.ai_plan_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_plan_log_idx on public.ai_plan_log (user_id, created_at desc);

-- Access helpers (security definer so policies on items can look at itineraries)
create or replace function public.can_view_itinerary(iid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.itineraries i
    where i.id = iid
      and (i.is_public or i.user_id = auth.uid()
           or (i.trip_id is not null and public.is_trip_member(i.trip_id)))
  );
$$;

create or replace function public.can_edit_itinerary(iid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.itineraries i
    where i.id = iid
      and (i.user_id = auth.uid()
           or (i.trip_id is not null and public.is_trip_member(i.trip_id)))
  );
$$;

alter table public.itineraries      enable row level security;
alter table public.itinerary_items  enable row level security;
alter table public.ai_plan_log      enable row level security;

create policy "itineraries read" on public.itineraries for select
  using (is_public or user_id = auth.uid() or (trip_id is not null and public.is_trip_member(trip_id)));
create policy "itineraries insert" on public.itineraries for insert
  with check (user_id = auth.uid() and (trip_id is null or public.is_trip_member(trip_id)));
-- Only the owner changes itinerary settings (title, visibility, trip link) or deletes it.
-- Trip members can edit the items inside.
create policy "itineraries update owner" on public.itineraries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (trip_id is null or public.is_trip_member(trip_id)));
create policy "itineraries delete owner" on public.itineraries for delete using (user_id = auth.uid());

create policy "items read" on public.itinerary_items for select using (public.can_view_itinerary(itinerary_id));
create policy "items insert" on public.itinerary_items for insert with check (public.can_edit_itinerary(itinerary_id));
create policy "items update" on public.itinerary_items for update
  using (public.can_edit_itinerary(itinerary_id)) with check (public.can_edit_itinerary(itinerary_id));
create policy "items delete" on public.itinerary_items for delete using (public.can_edit_itinerary(itinerary_id));

create policy "ai log insert own" on public.ai_plan_log for insert with check (user_id = auth.uid());
create policy "ai log read own" on public.ai_plan_log for select using (user_id = auth.uid());
