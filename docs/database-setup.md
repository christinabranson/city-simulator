# Database Setup Guide (Clerk + Supabase)

This project uses:

- **Clerk** for authentication
- **Supabase Postgres** for cloud save persistence
- **Next.js API route** (`/api/cloud/snapshot`) for server-side read/write

## 1) Prerequisites

- A Clerk app
- A Supabase project
- Local dev running with `npm run dev`

## 2) Environment Variables

Create `.env.local` in project root with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Important:

- `SUPABASE_SERVICE_ROLE_KEY` is **required** for the server API route.
- Do **not** commit `.env.local`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` is not used for cloud snapshot writes in the current architecture.

## 3) Create Required Table in Supabase

Run this SQL in Supabase SQL Editor (same project as `NEXT_PUBLIC_SUPABASE_URL`):

```sql
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

alter table public.city_snapshots enable row level security;

-- API routes use service role key; block direct client access.
create policy "deny_all_client_access"
on public.city_snapshots
for all
using (false)
with check (false);

create index if not exists city_snapshots_user_active_idx
  on public.city_snapshots (user_id, last_updated desc)
  where deleted_at is null;

create unique index if not exists city_snapshots_one_primary_per_user
  on public.city_snapshots (user_id)
  where is_primary and deleted_at is null;
```

This SQL is also available at `supabase/schema.sql`.

### If You Already Created the Old Single-City Table

Run this one-time migration:

```sql
alter table public.city_snapshots
  add column if not exists city_id text,
  add column if not exists city_name text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists schema_version text not null default 'v1',
  add column if not exists source text not null default 'web',
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_played_at timestamptz null,
  add column if not exists last_updated timestamptz not null default now(),
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_reason text null;

update public.city_snapshots
set city_id = coalesce(city_id, 'primary'),
    city_name = coalesce(city_name, 'My City'),
    is_primary = coalesce(is_primary, city_id = 'primary'),
    schema_version = coalesce(schema_version, 'v1'),
    source = coalesce(source, 'web'),
    metadata_json = coalesce(metadata_json, '{}'::jsonb),
    created_at = coalesce(created_at, updated_at, now()),
    last_played_at = coalesce(last_played_at, updated_at, now()),
    last_updated = coalesce(last_updated, updated_at, now()),
    deleted_reason = coalesce(deleted_reason, null);

alter table public.city_snapshots
  alter column city_id set not null,
  alter column city_name set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'city_snapshots_pkey'
      and conrelid = 'public.city_snapshots'::regclass
  ) then
    alter table public.city_snapshots drop constraint city_snapshots_pkey;
  end if;
end $$;

alter table public.city_snapshots
  add constraint city_snapshots_pkey primary key (user_id, city_id);

create index if not exists city_snapshots_user_active_idx
  on public.city_snapshots (user_id, last_updated desc)
  where deleted_at is null;

create unique index if not exists city_snapshots_one_primary_per_user
  on public.city_snapshots (user_id)
  where is_primary and deleted_at is null;
```

## 4) Restart Dev Server

After adding/updating env vars, restart:

```bash
npm run dev
```

## 5) Verify End-to-End

1. Open app and sign in with Clerk.
2. Place/update something in your city.
3. Refresh page.
4. Confirm no 500s for `/api/cloud/snapshot` in server logs.

Optional SQL verification:

```sql
select user_id, city_id, city_name, is_primary, source, created_at, last_played_at, last_updated, deleted_at
from public.city_snapshots
order by last_updated desc
limit 5;
```

## 6) Common Errors and Fixes

### Error: `Supabase env not configured.`

Cause:

- Missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.

Fix:

- Set both vars in `.env.local` and restart dev server.

### Error: `PGRST205 ... could not find table public.city_snapshots`

Cause:

- Table not created in current Supabase project, or URL points to different project.

Fix:

- Run schema SQL in the correct project.
- Verify `NEXT_PUBLIC_SUPABASE_URL` matches that project.

### Cloud sync disabled toast/warning

Cause:

- API route GET failed during cloud bootstrap.

Fix:

- Resolve env/table issues above, then reload app.

## 7) Current Data Flow (MVP)

- LocalStorage remains active as fallback.
- Signed-in users:
  - `GET /api/cloud/snapshot?cityId=<city_id>` to load city snapshot
  - `PUT /api/cloud/snapshot` with `cityId` and `cityName` to upsert city snapshot
  - `GET /api/cloud/cities` to list cities
  - `POST /api/cloud/cities` to create city
  - `PATCH /api/cloud/cities` to rename city
  - `DELETE /api/cloud/cities` to **soft delete** city (sets `deleted_at`; blocks deleting last city; optional transfer target)
- Signed-out users:
  - local-only saves

## 8) Metadata Fields (Why They Exist)

- `is_primary`: marks default city (useful for onboarding and fallback city selection)
- `schema_version`: snapshot schema tracking for future migrations
- `source`: write source (`web`, future clients can use different labels)
- `metadata_json`: flexible key/value bag for experiments without schema churn
- `created_at`: city record creation timestamp
- `last_played_at`: last time user actively wrote gameplay state
- `last_updated`: canonical sort/update timestamp for city management lists
- `deleted_at` + `deleted_reason`: soft-delete lifecycle and audit trail

### Manual Hard Delete (Optional, Admin Only)

App-level delete is soft-delete only. To permanently remove rows, run SQL manually:

```sql
delete from public.city_snapshots
where user_id = '<clerk_user_id>'
  and city_id = '<city_id>';
```
