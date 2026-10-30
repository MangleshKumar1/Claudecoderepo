-- YORVIA Phase 10: usage log for the extra AI tools (search, review summaries, photo identify).
-- Run AFTER schema.sql and phases 2-9. Run once.
-- (The AI trip planner keeps using ai_plan_log from phase 4.)

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('search','summary','identify')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_idx on public.ai_usage (user_id, kind, created_at desc);
alter table public.ai_usage enable row level security;
create policy "ai usage insert own" on public.ai_usage for insert with check (user_id = auth.uid());
create policy "ai usage read own" on public.ai_usage for select using (user_id = auth.uid());
