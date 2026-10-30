-- YORVIA Phase 11: business directory (vendor / guide panel with enquiries) and the admin panel.
-- Run AFTER schema.sql and phases 2-10. Run once.

-- ---------- Admins ----------
-- To make someone an admin, run this in the SQL editor (replace with their user id from Authentication -> Users):
--   insert into public.admins (user_id) values ('PASTE-USER-ID-HERE');
create table if not exists public.admins (
  user_id uuid primary key references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no policies: the app can never read or change this table

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- Business listings ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('stay','guide','vehicle','activity','operator','food')),
  name text not null check (char_length(name) between 2 and 100),
  description text check (description is null or char_length(description) <= 1500),
  city text check (city is null or char_length(city) <= 80),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  price_from numeric check (price_from >= 0 and price_from < 10000000),
  price_unit text check (price_unit in ('per night','per day','per person','per trip')),
  website text check (website is null or website ~* '^https://[^[:space:]]{3,200}$'),
  photo_key text,
  verified boolean not null default false,          -- set only by admins
  hidden_by_admin boolean not null default false,   -- set only by admins
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  constraint listings_photo_format check (photo_key is null or (photo_key ~ '^listings/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
                                          and split_part(photo_key, '/', 2) = owner_id::text))
);
create index if not exists listings_browse_idx on public.listings (status, kind, created_at desc);
create index if not exists listings_owner_idx on public.listings (owner_id);

create or replace function public.enforce_listing_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.listings where owner_id = new.owner_id) >= 10 then
    raise exception 'You can have at most 10 listings';
  end if;
  return new;
end $$;
drop trigger if exists listing_limit on public.listings;
create trigger listing_limit before insert on public.listings for each row execute function public.enforce_listing_limit();

alter table public.listings enable row level security;
create policy "listings public" on public.listings for select
  using ((status = 'active' and not hidden_by_admin) or owner_id = auth.uid() or public.is_admin());
create policy "listings create own" on public.listings for insert
  with check (owner_id = auth.uid() and not verified and not hidden_by_admin);
create policy "listings update own" on public.listings for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "listings delete own or admin" on public.listings for delete using (owner_id = auth.uid() or public.is_admin());
-- Owners can edit only the business details. They cannot touch verified, hidden_by_admin or owner_id.
revoke update on public.listings from anon, authenticated;
grant update (kind, name, description, city, lat, lng, price_from, price_unit, website, photo_key, status) on public.listings to authenticated;

-- Admin-only actions
create or replace function public.admin_set_listing(lid uuid, set_verified boolean, set_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.listings set verified = set_verified, hidden_by_admin = set_hidden where id = lid;
end $$;
revoke all on function public.admin_set_listing(uuid, boolean, boolean) from public;
grant execute on function public.admin_set_listing(uuid, boolean, boolean) to authenticated;

-- ---------- Enquiries (traveller -> business; no payments or bookings) ----------
create or replace function public.listing_owner(lid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select owner_id from public.listings where id = lid;
$$;
create or replace function public.listing_is_open(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings where id = lid and status = 'active' and not hidden_by_admin);
$$;
create or replace function public.blocked_by_listing_owner(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings l join public.blocks b on b.blocker_id = l.owner_id
                 where l.id = lid and b.blocked_id = auth.uid());
$$;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  from_user uuid not null references public.profiles on delete cascade,
  message text not null check (char_length(message) between 5 and 1000),
  contact text not null check (char_length(contact) between 3 and 120),   -- how the business may reach the traveller
  start_date date,
  end_date date,
  people int check (people between 1 and 100),
  status text not null default 'new' check (status in ('new','replied','closed')),
  owner_reply text check (owner_reply is null or char_length(owner_reply) <= 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists enquiries_listing_idx on public.enquiries (listing_id, created_at desc);
create index if not exists enquiries_user_idx on public.enquiries (from_user, created_at desc);

create or replace function public.enforce_enquiry_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.enquiries where from_user = new.from_user and listing_id = new.listing_id) >= 3 then
    raise exception 'You have already sent several enquiries to this business';
  end if;
  if (select count(*) from public.enquiries where from_user = new.from_user and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Daily enquiry limit reached. Try again tomorrow';
  end if;
  return new;
end $$;
drop trigger if exists enquiry_limits on public.enquiries;
create trigger enquiry_limits before insert on public.enquiries for each row execute function public.enforce_enquiry_limits();

alter table public.enquiries enable row level security;
-- Only the traveller who wrote it and the business owner can see an enquiry (contact details stay private).
create policy "enquiries visible to both sides" on public.enquiries for select
  using (from_user = auth.uid() or public.listing_owner(listing_id) = auth.uid());
create policy "enquire as self" on public.enquiries for insert
  with check (from_user = auth.uid() and status = 'new' and owner_reply is null
              and public.listing_owner(listing_id) <> auth.uid()
              and public.listing_is_open(listing_id) and not public.blocked_by_listing_owner(listing_id));
create policy "owner replies" on public.enquiries for update
  using (public.listing_owner(listing_id) = auth.uid()) with check (public.listing_owner(listing_id) = auth.uid());
revoke update on public.enquiries from anon, authenticated;
grant update (status, owner_reply, replied_at) on public.enquiries to authenticated;

-- ---------- Admin powers: moderate reports and remove content ----------
create policy "reports read admin" on public.reports for select using (public.is_admin());
create policy "reports update admin" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "posts delete admin" on public.posts for delete using (public.is_admin());
create policy "comments delete admin" on public.post_comments for delete using (public.is_admin());
create policy "places delete admin" on public.places for delete using (public.is_admin());
create policy "place photos delete admin" on public.place_photos for delete using (public.is_admin());
create policy "reviews delete admin" on public.reviews for delete using (public.is_admin());
create policy "trip messages delete admin" on public.trip_messages for delete using (public.is_admin());
create policy "collections delete admin" on public.collections for delete using (public.is_admin());
create policy "place reports delete admin" on public.place_reports for delete using (public.is_admin());

-- Admin dashboard numbers (the metrics views stay locked from regular users)
create or replace function public.admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'validation', (select to_jsonb(v) from public.metrics_validation v),
    'daily', (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from (select * from public.metrics_daily_active limit 14) d),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'listings', (select count(*) from public.listings),
    'unverified_listings', (select count(*) from public.listings where not verified));
end $$;
revoke all on function public.admin_metrics() from public;
grant execute on function public.admin_metrics() to authenticated;
