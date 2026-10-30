-- YORVIA Phase 9: place essentials, cost reality, emergency contacts.
-- Run AFTER schema.sql and phases 2-8. Run once.

-- ---------- Useful details on places ----------
alter table public.places
  add column if not exists toilet text check (toilet in ('yes_clean','yes_poor','no')),
  add column if not exists drinking_water boolean,
  add column if not exists parking text check (parking in ('free','paid','none')),
  add column if not exists fuel_nearby boolean,
  add column if not exists atm_nearby boolean,
  add column if not exists wheelchair_access boolean,
  add column if not exists mobile_network text check (mobile_network in ('none','weak','good')),
  add column if not exists entry_fee numeric check (entry_fee >= 0 and entry_fee < 1000000),
  add column if not exists parking_fee numeric check (parking_fee >= 0 and parking_fee < 1000000),
  add column if not exists typical_cost_per_day numeric check (typical_cost_per_day >= 0 and typical_cost_per_day < 10000000);

-- ---------- Cost reality: what was advertised vs what travellers actually paid ----------
alter table public.reviews
  add column if not exists advertised_price numeric check (advertised_price >= 0 and advertised_price < 10000000),
  add column if not exists actual_price numeric check (actual_price >= 0 and actual_price < 10000000);

create or replace view public.place_cost_reality as
select place_id,
       count(*)::int as reports,
       round(avg(advertised_price)::numeric, 0) as avg_advertised,
       round(avg(actual_price)::numeric, 0)     as avg_actual
from public.reviews
where advertised_price is not null and actual_price is not null
group by place_id;
grant select on public.place_cost_reality to anon, authenticated;

-- ---------- Emergency contacts (private to each user) ----------
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  relation text check (relation is null or char_length(relation) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists emergency_contacts_user_idx on public.emergency_contacts (user_id);

create or replace function public.enforce_contact_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.emergency_contacts where user_id = new.user_id) >= 5 then
    raise exception 'You can save up to 5 emergency contacts';
  end if;
  return new;
end $$;
drop trigger if exists emergency_contact_limit on public.emergency_contacts;
create trigger emergency_contact_limit before insert on public.emergency_contacts
  for each row execute function public.enforce_contact_limit();

alter table public.emergency_contacts enable row level security;
-- Nobody but the owner can read, add, change or delete these. Not even other logged-in users.
create policy "contacts read own" on public.emergency_contacts for select using (user_id = auth.uid());
create policy "contacts add own" on public.emergency_contacts for insert with check (user_id = auth.uid());
create policy "contacts update own" on public.emergency_contacts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contacts delete own" on public.emergency_contacts for delete using (user_id = auth.uid());
