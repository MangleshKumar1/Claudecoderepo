-- YORVIA Phase 3: profiles, verification, buddy ratings, reports, blocks.
-- Run AFTER schema.sql and phase2_trips.sql.

-- ---------- Profiles ----------
alter table public.profiles
  add column if not exists home_city text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists phone_verified boolean not null default false,
  add column if not exists email_verified boolean not null default false;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500);

-- Users may edit only these columns. Verification flags are set by the trigger below,
-- so nobody can mark themselves "verified".
revoke update on public.profiles from anon, authenticated;
grant update (display_name, username, bio, home_city, languages) on public.profiles to authenticated;

create or replace function public.sync_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set phone_verified = (new.phone_confirmed_at is not null),
         email_verified = (new.email_confirmed_at is not null)
   where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified after insert or update of phone_confirmed_at, email_confirmed_at
  on auth.users for each row execute function public.sync_verification();

-- Backfill existing users
update public.profiles p
   set phone_verified = (u.phone_confirmed_at is not null),
       email_verified = (u.email_confirmed_at is not null)
  from auth.users u where u.id = p.id;

-- ---------- Blocks ----------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks read own" on public.blocks for select using (blocker_id = auth.uid());
create policy "blocks insert own" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "blocks delete own" on public.blocks for delete using (blocker_id = auth.uid());

-- A blocked user can't ask to join the blocker's trips.
-- (security definer: the asker can't read the owner's blocks directly because of RLS)
create or replace function public.is_blocked_by_trip_owner(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips t join public.blocks b on b.blocker_id = t.user_id
                 where t.id = tid and b.blocked_id = auth.uid());
$$;

drop policy if exists "members request" on public.trip_members;
create policy "members request" on public.trip_members for insert
  with check (
    user_id = auth.uid() and status = 'pending' and not public.is_trip_owner(trip_id)
    and not public.is_blocked_by_trip_owner(trip_id)
  );

-- Messages from people you blocked are hidden from you (they aren't told)
drop policy if exists "chat read" on public.trip_messages;
create policy "chat read" on public.trip_messages for select
  using (
    public.is_trip_member(trip_id)
    and not exists (select 1 from public.blocks b
                    where b.blocker_id = auth.uid() and b.blocked_id = trip_messages.user_id)
  );

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_user_id uuid not null references public.profiles on delete cascade,
  trip_id uuid references public.trips on delete set null,
  message_id uuid references public.trip_messages on delete set null,
  reason text not null check (reason in ('harassment','scam','fake_profile','unsafe_behavior','inappropriate_content','other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> target_user_id)
);
create index if not exists reports_status_idx on public.reports (status, created_at);
alter table public.reports enable row level security;
-- Reporters can file and see their own reports. Staff review them via the Supabase dashboard
-- (service role bypasses RLS).
create policy "reports insert own" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports read own" on public.reports for select using (reporter_id = auth.uid());

-- ---------- Buddy ratings ----------
create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  rater_id uuid not null references public.profiles on delete cascade,
  ratee_id uuid not null references public.profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  would_travel_again boolean,
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (trip_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);
create index if not exists user_ratings_ratee_idx on public.user_ratings (ratee_id);

create or replace function public.is_trip_participant(tid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = tid and user_id = uid)
      or exists (select 1 from public.trip_members where trip_id = tid and user_id = uid and status = 'approved');
$$;

alter table public.user_ratings enable row level security;
create policy "ratings readable" on public.user_ratings for select using (true);
-- Only after the trip has ended, and only between people who were on it together
create policy "ratings insert" on public.user_ratings for insert with check (
  rater_id = auth.uid()
  and exists (select 1 from public.trips t where t.id = trip_id and t.end_date < current_date)
  and public.is_trip_participant(trip_id, rater_id)
  and public.is_trip_participant(trip_id, ratee_id)
);
create policy "ratings update own" on public.user_ratings for update using (rater_id = auth.uid());
create policy "ratings delete own" on public.user_ratings for delete using (rater_id = auth.uid());

-- ---------- Public profile stats ----------
create or replace view public.profile_stats as
select p.id as user_id,
       coalesce((select round(avg(r.rating)::numeric, 1) from public.user_ratings r where r.ratee_id = p.id), null) as rating_avg,
       (select count(*)::int from public.user_ratings r where r.ratee_id = p.id) as rating_count,
       (select count(*)::int from public.trips t where t.user_id = p.id) as trips_hosted,
       (select count(*)::int from public.trip_members m join public.trips t on t.id = m.trip_id
          where m.user_id = p.id and m.status = 'approved' and t.end_date < current_date) as trips_joined
from public.profiles p;
grant select on public.profile_stats to anon, authenticated;
