-- Personal Healthcare v6 optional database upgrade
alter table public.health_snapshots alter column schema_version set default 6;
