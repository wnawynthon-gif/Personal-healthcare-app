-- Personal Healthcare v8.0 — Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  recorded_at timestamptz not null,
  type text not null,
  value1 numeric,
  value2 numeric,
  unit text,
  note text,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  name text not null,
  dose text,
  reminder_time time,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text,
  note text,
  created_at timestamptz default now()
);

alter table public.health_records enable row level security;
alter table public.medications enable row level security;
alter table public.documents enable row level security;

-- Recommended policies when using Supabase Auth:
create policy "health_records_own" on public.health_records
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medications_own" on public.medications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "documents_own" on public.documents
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
