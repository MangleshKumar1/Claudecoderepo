-- Lets YORVIA's database (tables, row-level-security rules, triggers) run on a plain PostgreSQL server
-- instead of Supabase. Run this ONCE on an empty database BEFORE restoring a backup or running the phase SQL files.
--
-- What it provides (these normally come from Supabase):
--   * the roles anon and authenticated that the security rules refer to
--   * auth.users and auth.uid(): the rules ask "who is this?" through auth.uid()
--
-- What it does NOT provide: logging in. On plain Postgres you must run your own login system, and for each request
-- run:  SET LOCAL ROLE authenticated;  SET LOCAL request.jwt.claim.sub = '<the logged-in user id>';
-- That is exactly how the database test suites in this project check the rules.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, phone text,
  email_confirmed_at timestamptz, phone_confirmed_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth, public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
-- Realtime chat uses a publication named supabase_realtime; plain Postgres just needs it to exist.
do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;
