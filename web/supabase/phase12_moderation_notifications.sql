-- YORVIA Phase 12: account suspension (admin) and in-app notifications.
-- Run AFTER schema.sql and phases 2-11. Run once.

-- =====================================================================
-- Suspensions
-- =====================================================================
create table if not exists public.suspensions (
  user_id uuid primary key references public.profiles on delete cascade,
  reason text check (reason is null or char_length(reason) <= 300),
  suspended_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security;
-- You can see your own suspension (so the app can tell you). Admins can see all. Nobody can write directly.
create policy "own suspension readable" on public.suspensions for select using (user_id = auth.uid());
create policy "admins read suspensions" on public.suspensions for select using (public.is_admin());

create or replace function public.is_suspended(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspensions where user_id = uid);
$$;

create or replace function public.admin_suspend_user(target uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if target = auth.uid() then raise exception 'You cannot suspend yourself'; end if;
  if exists (select 1 from public.admins where user_id = target) then raise exception 'Admins cannot be suspended here'; end if;
  insert into public.suspensions (user_id, reason, suspended_by) values (target, nullif(left(why, 300), ''), auth.uid())
  on conflict (user_id) do update set reason = excluded.reason, suspended_by = excluded.suspended_by, created_at = now();
end $$;
create or replace function public.admin_unsuspend_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.suspensions where user_id = target;
end $$;
revoke all on function public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid) from public;
grant execute on function public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid) to authenticated;

-- Suspended people can still log in and read, but cannot create anything new.
create or replace function public.block_suspended() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text := to_jsonb(new) ->> tg_argv[0];
begin
  if actor is not null and public.is_suspended(actor::uuid) then
    raise exception 'Your account is suspended, so you can''t do this right now';
  end if;
  return new;
end $$;

do $$
declare t record;
begin
  for t in select * from (values
    ('places','user_id'),('reviews','user_id'),('place_reports','user_id'),('place_photos','user_id'),
    ('trips','user_id'),('trip_members','user_id'),('trip_messages','user_id'),('trip_expenses','paid_by'),
    ('polls','created_by'),('poll_options','added_by'),('poll_votes','user_id'),
    ('posts','user_id'),('post_photos','user_id'),('post_comments','user_id'),('post_likes','user_id'),
    ('follows','follower_id'),('collections','user_id'),('itineraries','user_id'),('user_ratings','rater_id'),
    ('listings','owner_id'),('enquiries','from_user'),('media_uploads','user_id'),
    ('ai_plan_log','user_id'),('ai_usage','user_id')
  ) as v(tbl, col) loop
    execute format('drop trigger if exists block_suspended_ins on public.%I', t.tbl);
    execute format('create trigger block_suspended_ins before insert on public.%I for each row execute function public.block_suspended(%L)', t.tbl, t.col);
  end loop;
end $$;

-- =====================================================================
-- In-app notifications (filled by database triggers; users can only read and mark as read)
-- =====================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,   -- the recipient
  kind text not null check (kind in ('enquiry','enquiry_reply','join_request','join_decision','comment','follow','rating','report_update')),
  title text not null check (char_length(title) <= 160),
  body text check (body is null or char_length(body) <= 200),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.-]{0,200}$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy "notifications read own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications update own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications delete own" on public.notifications for delete using (user_id = auth.uid());
-- no insert policy: only the trigger functions below can create notifications
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Helper used by the triggers. Skips notifying yourself, and skips people who blocked the actor.
create or replace function public.notify(recipient uuid, actor uuid, k text, t text, b text, l text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if recipient is null or recipient = actor then return; end if;
  if actor is not null and exists (select 1 from public.blocks where blocker_id = recipient and blocked_id = actor) then return; end if;
  insert into public.notifications (user_id, kind, title, body, link) values (recipient, k, left(t, 160), left(b, 200), l);
  delete from public.notifications where user_id = recipient and created_at < now() - interval '60 days';
end $$;
revoke all on function public.notify(uuid, uuid, text, text, text, text) from public;

create or replace function public.name_of(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(display_name, 'Someone') from public.profiles where id = uid;
$$;

-- 1. New enquiry -> business owner
create or replace function public.trg_notify_enquiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record;
begin
  select id, name, owner_id into l from public.listings where id = new.listing_id;
  perform public.notify(l.owner_id, new.from_user, 'enquiry', 'New enquiry for ' || l.name, left(new.message, 120), '/directory/' || l.id);
  return new;
end $$;
drop trigger if exists notify_enquiry on public.enquiries;
create trigger notify_enquiry after insert on public.enquiries for each row execute function public.trg_notify_enquiry();

-- 2. Owner replied -> traveller
create or replace function public.trg_notify_enquiry_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record;
begin
  if new.owner_reply is not null and new.owner_reply is distinct from old.owner_reply then
    select name, owner_id into l from public.listings where id = new.listing_id;
    perform public.notify(new.from_user, l.owner_id, 'enquiry_reply', l.name || ' replied to your enquiry', left(new.owner_reply, 120), '/directory/mine');
  end if;
  return new;
end $$;
drop trigger if exists notify_enquiry_reply on public.enquiries;
create trigger notify_enquiry_reply after update on public.enquiries for each row execute function public.trg_notify_enquiry_reply();

-- 3 + 4. Join requests -> organiser; decisions -> requester
create or replace function public.trg_notify_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare tr record;
begin
  select id, title, user_id into tr from public.trips where id = new.trip_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify(tr.user_id, new.user_id, 'join_request', public.name_of(new.user_id) || ' wants to join ' || tr.title, left(new.message, 120), '/trips/' || tr.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.notify(new.user_id, tr.user_id, 'join_decision',
      case when new.status = 'approved' then 'You''re in! ' || tr.title else 'Your request for ' || tr.title || ' wasn''t accepted' end, null, '/trips/' || tr.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_member on public.trip_members;
create trigger notify_member after insert or update on public.trip_members for each row execute function public.trg_notify_member();

-- 5. Comment on your post
create or replace function public.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select id, user_id into p from public.posts where id = new.post_id;
  perform public.notify(p.user_id, new.user_id, 'comment', public.name_of(new.user_id) || ' commented on your post', left(new.body, 120), '/posts/' || p.id);
  return new;
end $$;
drop trigger if exists notify_comment on public.post_comments;
create trigger notify_comment after insert on public.post_comments for each row execute function public.trg_notify_comment();

-- 6. New follower
create or replace function public.trg_notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.followee_id, new.follower_id, 'follow', public.name_of(new.follower_id) || ' started following you', null, '/profile/' || new.follower_id);
  return new;
end $$;
drop trigger if exists notify_follow on public.follows;
create trigger notify_follow after insert on public.follows for each row execute function public.trg_notify_follow();

-- 7. Rated after a trip
create or replace function public.trg_notify_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.ratee_id, new.rater_id, 'rating', public.name_of(new.rater_id) || ' rated you after a trip', left(new.comment, 120), '/profile/' || new.ratee_id);
  return new;
end $$;
drop trigger if exists notify_rating on public.user_ratings;
create trigger notify_rating after insert on public.user_ratings for each row execute function public.trg_notify_rating();

-- 8. Your report was reviewed
create or replace function public.trg_notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('actioned', 'dismissed') then
    perform public.notify(new.reporter_id, null, 'report_update', 'Update on your report',
      case when new.status = 'actioned' then 'Thank you. We took action on your report.' else 'Thank you. We reviewed your report and found no action was needed.' end, null);
  end if;
  return new;
end $$;
drop trigger if exists notify_report on public.reports;
create trigger notify_report after update on public.reports for each row execute function public.trg_notify_report();

-- =====================================================================
-- Allow the "route" AI-tool usage kind (road routing, phase 12 app code)
-- =====================================================================
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('search','summary','identify','route'));
