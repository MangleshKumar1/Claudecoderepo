-- YORVIA Phase 8: social feed (posts, likes, comments, follows), avatars, collections, activity stats.
-- Run AFTER schema.sql and phases 2-7. Run once.

-- ---------- Avatars ----------
alter table public.profiles add column if not exists avatar_key text;
alter table public.profiles drop constraint if exists profiles_avatar_key_format;
alter table public.profiles add constraint profiles_avatar_key_format check (
  avatar_key is null or (avatar_key ~ '^avatars/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
                         and split_part(avatar_key, '/', 2) = id::text));
grant update (avatar_key) on public.profiles to authenticated;

-- ---------- Follows ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select using (true);
create policy "follow as self" on public.follows for insert with check (follower_id = auth.uid());
create policy "unfollow as self" on public.follows for delete using (follower_id = auth.uid());

-- ---------- Posts ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  place_id uuid references public.places on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists posts_time_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);

create table if not exists public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  storage_key text not null unique,
  position int not null default 0,
  constraint post_photos_key_format check (storage_key ~ '^posts/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  constraint post_photos_key_owner check (split_part(storage_key, '/', 2) = user_id::text)
);
create index if not exists post_photos_post_idx on public.post_photos (post_id, position);

create or replace function public.enforce_post_photo_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.post_photos where post_id = new.post_id) >= 6 then
    raise exception 'A post can have at most 6 photos';
  end if;
  return new;
end $$;
drop trigger if exists post_photo_limit on public.post_photos;
create trigger post_photo_limit before insert on public.post_photos
  for each row execute function public.enforce_post_photo_limit();

create table if not exists public.post_likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_idx on public.post_comments (post_id, created_at);

-- Helper: has the post's author blocked this user?
create or replace function public.blocked_by_post_author(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.posts p join public.blocks b on b.blocker_id = p.user_id
                 where p.id = pid and b.blocked_id = auth.uid());
$$;

alter table public.posts         enable row level security;
alter table public.post_photos   enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

-- Posts and comments are public, except content from people you've blocked is hidden from you
create policy "posts readable" on public.posts for select using (
  not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = posts.user_id));
create policy "posts create" on public.posts for insert with check (user_id = auth.uid());
create policy "posts delete own" on public.posts for delete using (user_id = auth.uid());

create policy "post photos readable" on public.post_photos for select using (true);
create policy "post photos add to own post" on public.post_photos for insert
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "post photos delete own" on public.post_photos for delete using (user_id = auth.uid());

create policy "likes readable" on public.post_likes for select using (true);
create policy "like as self" on public.post_likes for insert
  with check (user_id = auth.uid() and not public.blocked_by_post_author(post_id));
create policy "unlike as self" on public.post_likes for delete using (user_id = auth.uid());

create policy "comments readable" on public.post_comments for select using (
  not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = post_comments.user_id));
create policy "comment as self" on public.post_comments for insert
  with check (user_id = auth.uid() and not public.blocked_by_post_author(post_id));
create policy "comment delete own or post author" on public.post_comments for delete using (
  user_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

create or replace view public.post_stats as
select p.id as post_id,
       (select count(*)::int from public.post_likes l where l.post_id = p.id) as likes,
       (select count(*)::int from public.post_comments c where c.post_id = p.id) as comments
from public.posts p;
grant select on public.post_stats to anon, authenticated;

-- ---------- Collections ("20 best waterfalls in India") ----------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text check (description is null or char_length(description) <= 400),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists collections_user_idx on public.collections (user_id, created_at desc);
create table if not exists public.collection_places (
  collection_id uuid not null references public.collections on delete cascade,
  place_id uuid not null references public.places on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, place_id)
);

create or replace function public.can_view_collection(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.collections c where c.id = cid and (c.is_public or c.user_id = auth.uid()));
$$;
create or replace function public.owns_collection(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.collections c where c.id = cid and c.user_id = auth.uid());
$$;

create or replace function public.enforce_collection_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.collection_places where collection_id = new.collection_id) >= 50 then
    raise exception 'A collection can hold at most 50 places';
  end if;
  return new;
end $$;
drop trigger if exists collection_limit on public.collection_places;
create trigger collection_limit before insert on public.collection_places
  for each row execute function public.enforce_collection_limit();

alter table public.collections       enable row level security;
alter table public.collection_places enable row level security;
create policy "collections readable" on public.collections for select using (is_public or user_id = auth.uid());
create policy "collections create" on public.collections for insert with check (user_id = auth.uid());
create policy "collections update own" on public.collections for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "collections delete own" on public.collections for delete using (user_id = auth.uid());
create policy "collection items readable" on public.collection_places for select using (public.can_view_collection(collection_id));
create policy "collection items add own" on public.collection_places for insert with check (public.owns_collection(collection_id));
create policy "collection items remove own" on public.collection_places for delete using (public.owns_collection(collection_id));

-- ---------- Activity stats (powers badges, reputation, travel passport counts) ----------
create or replace view public.profile_activity as
select p.id as user_id,
  (select count(*)::int from public.places x where x.user_id = p.id)                         as pins,
  (select count(*)::int from public.reviews x where x.user_id = p.id)                        as reviews,
  (select count(*)::int from public.place_photos x where x.user_id = p.id)                   as photos,
  (select count(*)::int from public.place_reports x where x.user_id = p.id)                  as condition_reports,
  (select count(*)::int from public.posts x where x.user_id = p.id)                          as posts,
  (select count(*)::int from public.collections x where x.user_id = p.id and x.is_public)    as collections,
  (select count(*)::int from public.follows x where x.followee_id = p.id)                    as followers,
  (select count(*)::int from public.follows x where x.follower_id = p.id)                    as following
from public.profiles p;
grant select on public.profile_activity to anon, authenticated;

-- ---------- Analytics events (full list through Phase 12) ----------
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'page_view','place_created','place_saved','review_created','condition_reported',
  'trip_created','join_requested','itinerary_created','ai_plan_generated','expense_added',
  'invite_shared','route_search','report_filed','photo_uploaded','poll_created','poll_voted',
  'post_created','post_liked','comment_added','followed','collection_created',
  'ai_search','ai_summary','photo_identified','listing_created','enquiry_sent','sos_opened','surprise_me','weather_checked'));
