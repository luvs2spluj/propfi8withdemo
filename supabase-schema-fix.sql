-- required for gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Minimal app users table (if you don't already have one)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

-- 2) Your csv_data table with the columns your app is inserting
create table if not exists public.csv_data (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text,
  uploaded_at timestamptz not null default now(),
  total_records integer,
  account_categories jsonb,
  bucket_assignments jsonb,
  is_active boolean not null default true,
  preview_data jsonb,
  user_id uuid, -- <-- your app is sending this; keep it
  created_at timestamptz not null default now()
);

-- If you want user_id to reference your users table, add this:
alter table public.csv_data
  drop constraint if exists csv_data_user_id_fkey;

alter table public.csv_data
  add constraint csv_data_user_id_fkey
  foreign key (user_id) references public.users(id);

-- 3) RPC your app calls: ensure_user_exists(email, first, last)
create or replace function public.ensure_user_exists(
  user_email text,
  user_first_name text,
  user_last_name text
) returns void
language plpgsql
as $$
begin
  insert into public.users(email, first_name, last_name)
  values (user_email, user_first_name, user_last_name)
  on conflict (email) do nothing;
end;
$$;

-- Make the RPC callable via PostgREST
grant execute on function public.ensure_user_exists(text, text, text) to anon, authenticated;

-- 4) (Optional) RLS policies
-- If RLS is ON, add permissive dev policies so inserts/selects don't 403.
-- You can tighten later.

-- Enable RLS
alter table public.csv_data enable row level security;

-- Dev policy: allow anyone to insert/select (relax for now, secure later)
drop policy if exists "csv_data select all" on public.csv_data;
create policy "csv_data select all"
on public.csv_data for select
to anon, authenticated
using (true);

drop policy if exists "csv_data insert all" on public.csv_data;
create policy "csv_data insert all"
on public.csv_data for insert
to anon, authenticated
with check (true);
