-- Live Auth user provisioning diagnosis and repair
-- Project: vatpvfrbgeatdeypqcrv
-- Purpose:
-- 1. Inspect any custom triggers attached to auth.users
-- 2. Inspect likely trigger functions
-- 3. Provide a minimal safe replacement trigger that only creates a lightweight public profile row
--
-- Run sections one at a time in Supabase SQL Editor.

-- =====================================================
-- SECTION 1: DIAGNOSE CURRENT auth.users TRIGGERS
-- =====================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'auth'
  and c.relname = 'users'
order by t.tgname;

-- =====================================================
-- SECTION 2: INSPECT LIKELY USER-CREATION FUNCTIONS
-- =====================================================

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname ilike '%user%'
   or p.proname ilike '%signup%'
   or p.proname ilike '%profile%'
order by 1, 2;

-- =====================================================
-- SECTION 3: CHECK COMMON TARGET TABLES
-- =====================================================

select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
  and table_name in ('profiles', 'users', 'user_profiles')
order by table_schema, table_name;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

-- =====================================================
-- SECTION 4: CHECK CONSTRAINTS ON public.profiles
-- Skip if public.profiles does not exist.
-- =====================================================

select
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
order by conname;

-- =====================================================
-- SECTION 5: OPTIONAL QUICK ISOLATION TEST
-- Replace the trigger name after inspecting SECTION 1.
-- Disable only briefly for one signup test, then re-enable.
-- =====================================================

-- alter table auth.users disable trigger your_trigger_name;
-- alter table auth.users enable trigger your_trigger_name;

-- =====================================================
-- SECTION 6: MINIMAL SAFE PROFILE TABLE
-- Run only if you do not already have a usable public.profiles table.
-- =====================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'artist',
  subscription_tier text default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- SECTION 7: MINIMAL SAFE TRIGGER FUNCTION
-- This avoids assumptions about first_name/last_name/custom columns.
-- =====================================================

create or replace function public.handle_new_auth_user_minimal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    subscription_tier,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'artist'),
    coalesce(new.raw_user_meta_data ->> 'subscriptionTier', 'free'),
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      role = excluded.role,
      subscription_tier = excluded.subscription_tier,
      updated_at = now();

  return new;
end;
$$;

-- =====================================================
-- SECTION 8: ATTACH THE MINIMAL TRIGGER
-- Replace old trigger/function only after you have captured them.
-- =====================================================

-- Example cleanup. Replace names after reviewing SECTION 1 output.
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();

create trigger on_auth_user_created_minimal
after insert on auth.users
for each row execute function public.handle_new_auth_user_minimal();

-- =====================================================
-- SECTION 9: POST-REPAIR TESTS
-- =====================================================

-- After applying the repair:
-- 1. Retry a test signup in Authentication or your app.
-- 2. Retry label artist creation in the label dashboard.
-- 3. Confirm a matching row appears in public.profiles.

-- Example verification:
-- select id, email, raw_user_meta_data from auth.users order by created_at desc limit 5;
-- select * from public.profiles order by created_at desc limit 5;

-- =====================================================
-- SECTION 10: ROLLBACK NOTE
-- =====================================================

-- If you need to undo the minimal trigger:
-- drop trigger if exists on_auth_user_created_minimal on auth.users;
-- drop function if exists public.handle_new_auth_user_minimal();
