-- Personal Healthcare v9.3-v9.6 upgrade
-- Run in the SAME Supabase project after the earlier schema files.

create table if not exists public.bp_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null, period text not null check (period in ('morning','evening')),
  sys1 integer not null, dia1 integer not null, sys2 integer not null, dia2 integer not null,
  rested boolean default false, created_at timestamptz default now()
);

create table if not exists public.app_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  app_version text not null default '9.6', updated_at timestamptz default now()
);

alter table public.bp_sessions enable row level security;
alter table public.app_snapshots enable row level security;
create policy "own bp sessions" on public.bp_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own app snapshot" on public.app_snapshots for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create index if not exists bp_sessions_user_date_idx on public.bp_sessions(user_id, measured_on desc);

