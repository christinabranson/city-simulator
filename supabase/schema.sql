create table if not exists public.city_snapshots (
  user_id text not null,
  city_id text not null,
  city_name text not null default 'My City',
  snapshot_json jsonb not null,
  is_primary boolean not null default false,
  schema_version text not null default 'v1',
  source text not null default 'web',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_played_at timestamptz null,
  last_updated timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  deleted_reason text null,
  primary key (user_id, city_id)
);

create index if not exists city_snapshots_user_active_idx
  on public.city_snapshots (user_id, last_updated desc)
  where deleted_at is null;

create unique index if not exists city_snapshots_one_primary_per_user
  on public.city_snapshots (user_id)
  where is_primary and deleted_at is null;

alter table public.city_snapshots enable row level security;

-- API routes use Supabase service role key, so block direct client access.
create policy "deny_all_client_access"
on public.city_snapshots
for all
using (false)
with check (false);
