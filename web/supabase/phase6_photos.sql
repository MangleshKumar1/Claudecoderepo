-- TripMates / YORVIA Phase 6: place photos stored in Cloudflare R2.
-- Run AFTER schema.sql and phases 2-5. Run once.
-- The database stores only each photo's storage key; the file lives in the R2 bucket.

create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  storage_key text not null unique,
  caption text check (caption is null or char_length(caption) <= 120),
  created_at timestamptz not null default now(),
  -- Keys must live in our own namespace and under the uploader's own folder,
  -- so nobody can attach arbitrary URLs or someone else's files.
  constraint place_photos_key_format check (storage_key ~ '^places/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  constraint place_photos_key_owner check (split_part(storage_key, '/', 2) = user_id::text)
);
create index if not exists place_photos_place_idx on public.place_photos (place_id, created_at);

-- Keep galleries bounded: 20 photos per place, 8 per person per place
create or replace function public.enforce_photo_limits() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.place_photos where place_id = new.place_id) >= 20 then
    raise exception 'This place already has the maximum number of photos';
  end if;
  if (select count(*) from public.place_photos where place_id = new.place_id and user_id = new.user_id) >= 8 then
    raise exception 'You have already added the maximum number of photos to this place';
  end if;
  return new;
end $$;
drop trigger if exists place_photo_limits on public.place_photos;
create trigger place_photo_limits before insert on public.place_photos
  for each row execute function public.enforce_photo_limits();

alter table public.place_photos enable row level security;
create policy "photos readable" on public.place_photos for select using (true);
create policy "photos insert own" on public.place_photos for insert with check (user_id = auth.uid());
create policy "photos delete own" on public.place_photos for delete using (user_id = auth.uid());

-- Cover photo per place (the first one uploaded), for cards and lists
create or replace view public.place_covers as
select distinct on (place_id) place_id, storage_key
from public.place_photos
order by place_id, created_at asc;
grant select on public.place_covers to anon, authenticated;

-- Upload log: powers the daily upload cap and lets you find orphaned files
-- (uploaded but never attached to a place).
create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  storage_key text not null,
  bytes int not null check (bytes > 0),
  created_at timestamptz not null default now()
);
create index if not exists media_uploads_user_idx on public.media_uploads (user_id, created_at desc);
alter table public.media_uploads enable row level security;
create policy "uploads insert own" on public.media_uploads for insert with check (user_id = auth.uid());
create policy "uploads read own" on public.media_uploads for select using (user_id = auth.uid());

-- Allow the new analytics event
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'page_view','place_created','place_saved','review_created','condition_reported',
  'trip_created','join_requested','itinerary_created','ai_plan_generated','expense_added',
  'invite_shared','route_search','report_filed','photo_uploaded'));
