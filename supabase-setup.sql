-- Personal Healthcare v5 — Supabase setup
-- Run in Supabase SQL Editor.

create table if not exists public.health_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  schema_version integer not null default 5,
  revision bigint not null default 0,
  device_id text,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.health_snapshots enable row level security;

drop policy if exists "Users can view own health snapshot" on public.health_snapshots;
create policy "Users can view own health snapshot"
on public.health_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own health snapshot" on public.health_snapshots;
create policy "Users can insert own health snapshot"
on public.health_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own health snapshot" on public.health_snapshots;
create policy "Users can update own health snapshot"
on public.health_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own health snapshot" on public.health_snapshots;
create policy "Users can delete own health snapshot"
on public.health_snapshots
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.health_snapshots to authenticated;
revoke all on public.health_snapshots from anon;
