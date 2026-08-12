-- Personal Healthcare v9.1: Weight Management & Body Tracking
create table if not exists weight_goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, target_weight numeric, weekly_target numeric, daily_calorie_target integer, daily_protein_target integer, daily_steps_target integer, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists body_measurements (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, measured_on date not null, weight_kg numeric, waist_cm numeric, created_at timestamptz default now());
create table if not exists food_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, calories integer, protein_g numeric, note text, created_at timestamptz default now());
create table if not exists exercise_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, steps integer, cardio_minutes integer, strength_minutes integer, note text, created_at timestamptz default now());
alter table weight_goals enable row level security; alter table body_measurements enable row level security; alter table food_logs enable row level security; alter table exercise_logs enable row level security;
create policy "own weight goals" on weight_goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own measurements" on body_measurements for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own food logs" on food_logs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own exercise logs" on exercise_logs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
