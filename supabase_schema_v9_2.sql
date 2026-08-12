-- Personal Healthcare v9.2: AI Coach insights + progress photos
-- Run after supabase_schema_v9_1.sql in the existing Supabase project.

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_on date not null,
  storage_path text not null,
  view_type text default 'front' check (view_type in ('front','side','back','other')),
  note text,
  created_at timestamptz default now()
);

create table if not exists ai_health_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz default now(),
  period_start date,
  period_end date,
  summary text,
  action_plan jsonb default '[]'::jsonb,
  evidence jsonb default '[]'::jsonb,
  safety_flags jsonb default '[]'::jsonb,
  engine_version text default '9.2'
);

alter table progress_photos enable row level security;
alter table ai_health_insights enable row level security;

create policy "own progress photos" on progress_photos for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own ai insights" on ai_health_insights for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

