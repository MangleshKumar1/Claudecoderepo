-- YORVIA Phase 5: richer place info, condition reports, trip expenses, analytics.
-- Run AFTER schema.sql, phase2_trips.sql, phase3_safety.sql, phase4_itineraries.sql. Run once.

-- ---------- More place categories (waterfalls, viewpoints, rest stops) ----------
alter table public.places drop constraint if exists places_category_check;
alter table public.places add constraint places_category_check check (category in
  ('beach','mountain','trek','food','city','culture','nature','stay','offbeat','waterfall','viewpoint','rest_stop'));

-- ---------- Multi-dimension reviews ----------
alter table public.reviews
  add column if not exists beauty_rating int check (beauty_rating between 1 and 5),
  add column if not exists accessibility_rating int check (accessibility_rating between 1 and 5),
  add column if not exists cleanliness_rating int check (cleanliness_rating between 1 and 5),
  add column if not exists crowd_rating int check (crowd_rating between 1 and 5); -- 1 = empty, 5 = very crowded

-- Per-place summary: averages per dimension, how many people reported, and how fresh the info is
create or replace view public.place_dimension_stats as
select p.id as place_id,
       count(r.id)::int as review_count,
       round(avg(r.rating)::numeric, 1)             as avg_rating,
       round(avg(r.beauty_rating)::numeric, 1)      as avg_beauty,
       round(avg(r.accessibility_rating)::numeric, 1) as avg_accessibility,
       round(avg(r.cleanliness_rating)::numeric, 1) as avg_cleanliness,
       round(avg(r.safety_rating)::numeric, 1)      as avg_safety,
       round(avg(r.value_rating)::numeric, 1)       as avg_value,
       round(avg(r.crowd_rating)::numeric, 1)       as avg_crowd,
       max(r.visited_on)                            as last_visited
from public.places p
left join public.reviews r on r.place_id = p.id
group by p.id;
grant select on public.place_dimension_stats to anon, authenticated;

-- ---------- Condition reports ("road damaged", "entry fee increased"...) ----------
create table if not exists public.place_reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in
    ('road_damaged','fee_changed','dry_or_closed','parking_unavailable','overcrowded','unsafe','permanently_closed','all_good')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists place_reports_idx on public.place_reports (place_id, created_at desc);
alter table public.place_reports enable row level security;
create policy "place reports readable" on public.place_reports for select using (true);
create policy "place reports insert own" on public.place_reports for insert with check (user_id = auth.uid());
create policy "place reports delete own" on public.place_reports for delete using (user_id = auth.uid());

-- ---------- Trip expenses (equal split among everyone on the trip) ----------
create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  paid_by uuid not null references public.profiles on delete cascade,
  amount numeric(12,2) not null check (amount > 0 and amount < 10000000),
  description text not null check (char_length(description) between 1 and 120),
  category text not null default 'other'
    check (category in ('stay','transport','fuel','food','activities','tickets','other')),
  created_at timestamptz not null default now()
);
create index if not exists trip_expenses_idx on public.trip_expenses (trip_id, created_at);
alter table public.trip_expenses enable row level security;
create policy "expenses read members" on public.trip_expenses for select using (public.is_trip_member(trip_id));
create policy "expenses insert own" on public.trip_expenses for insert
  with check (paid_by = auth.uid() and public.is_trip_member(trip_id));
create policy "expenses update own" on public.trip_expenses for update
  using (paid_by = auth.uid() and public.is_trip_member(trip_id))
  with check (paid_by = auth.uid() and public.is_trip_member(trip_id));
create policy "expenses delete own or organiser" on public.trip_expenses for delete
  using ((paid_by = auth.uid() and public.is_trip_member(trip_id)) or public.is_trip_owner(trip_id));

-- ---------- First-party analytics ----------
-- Anyone (logged in or not) can add events. Nobody can read them through the app/API:
-- read them in the Supabase SQL editor. The metrics views below are locked to admins.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete set null,
  anon_id text check (anon_id is null or char_length(anon_id) <= 64),
  name text not null check (name in (
    'page_view','place_created','place_saved','review_created','condition_reported',
    'trip_created','join_requested','itinerary_created','ai_plan_generated','expense_added',
    'invite_shared','route_search','report_filed')),
  path text check (path is null or char_length(path) <= 200),
  props jsonb not null default '{}'::jsonb check (octet_length(props::text) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists events_time_idx on public.events (created_at);
create index if not exists events_actor_idx on public.events ((coalesce(user_id::text, anon_id)), created_at);
alter table public.events enable row level security;
create policy "events insert" on public.events for insert
  with check (user_id is null or user_id = auth.uid());
-- (no select/update/delete policies: events are write-only for clients)

-- Metrics for the validation targets in docs/PRODUCT_STRATEGY.md.
-- Views run with the owner's rights, so we explicitly remove access from app roles.
create or replace view public.metrics_daily_active as
select created_at::date as day,
       count(distinct coalesce(user_id::text, anon_id)) as active_people,
       count(distinct user_id) as active_members
from public.events
where name = 'page_view'
group by 1 order by 1 desc;

create or replace view public.metrics_validation as
with actor_days as (
  select coalesce(user_id::text, anon_id) as actor, created_at::date as day
  from public.events where coalesce(user_id::text, anon_id) is not null
  group by 1, 2
), first_seen as (
  select actor, min(day) as d0 from actor_days group by actor
), cohort as (
  select f.actor, f.d0,
         exists (select 1 from actor_days a where a.actor = f.actor and a.day between f.d0 + 1 and f.d0 + 7) as returned
  from first_seen f
  where f.d0 <= current_date - 8   -- only people old enough to have had a chance to return
)
select
  (select count(distinct coalesce(user_id::text, anon_id)) from public.events)                          as people_seen,
  (select count(distinct user_id) from public.events where name in ('place_created','review_created','condition_reported')) as contributors,
  (select count(*) from public.events where name = 'place_created')                                     as places_submitted,
  (select count(distinct user_id) from public.events where name = 'place_saved')                        as people_who_saved,
  (select count(distinct user_id) from public.events where name = 'invite_shared')                      as people_who_shared,
  (select count(*) from public.events where name = 'join_requested')                                    as join_requests,
  (select count(*) from public.events where name = 'ai_plan_generated')                                 as ai_plans,
  (select count(*) from cohort)                                                                         as cohort_size,
  (select round(100.0 * count(*) filter (where returned) / nullif(count(*), 0), 1) from cohort)         as returned_within_7d_pct;

revoke all on public.metrics_daily_active, public.metrics_validation from anon, authenticated;
