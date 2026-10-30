-- YORVIA Phase 7: group polls inside trips (vote on destination, dates, stay, activities...).
-- Run AFTER schema.sql and phases 2-6. Run once.

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  created_by uuid not null references public.profiles on delete cascade,
  question text not null check (char_length(question) between 3 and 160),
  kind text not null default 'other' check (kind in ('destination','dates','stay','activity','transport','other')),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists polls_trip_idx on public.polls (trip_id, created_at desc);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  added_by uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, id)   -- lets votes prove the option belongs to the same poll
);
create index if not exists poll_options_poll_idx on public.poll_options (poll_id);

-- One vote per person per poll (change it by voting again)
create table if not exists public.poll_votes (
  poll_id uuid not null,
  option_id uuid not null,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  foreign key (poll_id, option_id) references public.poll_options (poll_id, id) on delete cascade
);
create index if not exists poll_votes_option_idx on public.poll_votes (option_id);

-- Helpers (security definer so policies can look up the trip without recursion)
create or replace function public.poll_trip(pid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select trip_id from public.polls where id = pid;
$$;
create or replace function public.poll_is_open(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.polls where id = pid and status = 'open');
$$;

-- Keep polls bounded: 10 options per poll, 30 polls per trip
create or replace function public.enforce_poll_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'poll_options' then
    if (select count(*) from public.poll_options where poll_id = new.poll_id) >= 10 then
      raise exception 'A poll can have at most 10 options';
    end if;
  else
    if (select count(*) from public.polls where trip_id = new.trip_id) >= 30 then
      raise exception 'This trip already has the maximum number of polls';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists poll_option_limits on public.poll_options;
create trigger poll_option_limits before insert on public.poll_options
  for each row execute function public.enforce_poll_limits();
drop trigger if exists poll_limits on public.polls;
create trigger poll_limits before insert on public.polls
  for each row execute function public.enforce_poll_limits();

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

-- Only people on the trip (organiser + approved members) can see or use its polls
create policy "polls read" on public.polls for select using (public.is_trip_member(trip_id));
create policy "polls create" on public.polls for insert
  with check (created_by = auth.uid() and public.is_trip_member(trip_id));
create policy "polls close by creator or organiser" on public.polls for update
  using (created_by = auth.uid() or public.is_trip_owner(trip_id))
  with check (created_by = auth.uid() or public.is_trip_owner(trip_id));
create policy "polls delete by creator or organiser" on public.polls for delete
  using (created_by = auth.uid() or public.is_trip_owner(trip_id));

create policy "options read" on public.poll_options for select
  using (public.is_trip_member(public.poll_trip(poll_id)));
create policy "options add while open" on public.poll_options for insert
  with check (added_by = auth.uid() and public.is_trip_member(public.poll_trip(poll_id)) and public.poll_is_open(poll_id));
create policy "options remove" on public.poll_options for delete
  using ((added_by = auth.uid() and public.poll_is_open(poll_id)) or public.is_trip_owner(public.poll_trip(poll_id)));

create policy "votes read" on public.poll_votes for select
  using (public.is_trip_member(public.poll_trip(poll_id)));
create policy "votes cast while open" on public.poll_votes for insert
  with check (user_id = auth.uid() and public.is_trip_member(public.poll_trip(poll_id)) and public.poll_is_open(poll_id));
create policy "votes change while open" on public.poll_votes for update
  using (user_id = auth.uid() and public.poll_is_open(poll_id))
  with check (user_id = auth.uid() and public.is_trip_member(public.poll_trip(poll_id)) and public.poll_is_open(poll_id));
create policy "votes withdraw while open" on public.poll_votes for delete
  using (user_id = auth.uid() and public.poll_is_open(poll_id));

-- New analytics events
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'page_view','place_created','place_saved','review_created','condition_reported',
  'trip_created','join_requested','itinerary_created','ai_plan_generated','expense_added',
  'invite_shared','route_search','report_filed','photo_uploaded','poll_created','poll_voted'));
