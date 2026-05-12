# Live Auth Provisioning Runbook

Project: `vatpvfrbgeatdeypqcrv`
Main API function: `make-server-79198001`
Current observed live symptom: new user creation fails in Supabase Auth with `Database error creating new user`.

## What Is Already Verified

- Existing users can still sign in.
- Label authorization on the live edge function is fixed.
- The label-managed artist route now returns a precise `503` explaining that Auth provisioning is blocked upstream.
- Public signup and server-side `auth.admin.createUser(...)` both fail, so this is not limited to one code path.

## Likely Failure Area

This class of error usually means one of these is broken in the live Supabase project:

- a trigger on `auth.users`
- a function called by an `auth.users` trigger
- a constraint or type mismatch in a table populated during signup
- a broken dependency inside a trigger function
- a permissions issue on a table/function touched during user creation

## Dashboard Checks

Run these in Supabase Dashboard for project `vatpvfrbgeatdeypqcrv`.

### 1. Confirm the failure from Auth logs

Open:
- Authentication
- Logs

Look for failed signup or admin user creation attempts around the most recent timestamps.

What to capture:
- exact error text
- request id
- whether the failure mentions a trigger, function, relation, column, or constraint

### 2. Check Postgres logs

Open:
- Logs
- Postgres

Filter around the same timestamps.

Look for messages containing:
- `auth.users`
- `trigger`
- `function`
- `constraint`
- `null value`
- `violates`
- `permission denied`
- `record "new"`
- `does not exist`

### 3. Check whether any custom signup trigger exists

Open SQL Editor and run:

```sql
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
```

Expected outcome:
- identify every non-internal trigger attached to `auth.users`

### 4. Inspect trigger functions backing those triggers

For each function name returned above, run:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname ilike '%handle%user%'
   or p.proname ilike '%new%user%'
   or p.proname ilike '%signup%'
order by 1, 2;
```

If you already know the exact function name, narrow the filter to that function.

### 5. Check for broken references in common profile tables

Run this to see whether the usual downstream tables exist:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
  and table_name in ('profiles', 'users', 'user_profiles')
order by table_schema, table_name;
```

Then inspect columns for the table your trigger writes into:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;
```

If your trigger writes into a different table, replace `profiles`.

### 6. Check constraints that may reject new rows

Replace `public.profiles` with the actual target table from the trigger.

```sql
select
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
order by conname;
```

Look for:
- `not null` columns your trigger is not filling
- enum/type mismatches
- uniqueness collisions
- foreign keys referencing missing rows

### 7. Check RLS and grants if the trigger uses `security invoker`

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'users', 'user_profiles')
order by tablename, policyname;
```

And:

```sql
select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema not in ('pg_catalog', 'information_schema')
  and routine_name ilike '%user%';
```

A signup trigger function should usually not depend on end-user RLS behavior.

### 8. Check whether raw metadata assumptions are broken

If the trigger reads fields like `new.raw_user_meta_data ->> 'firstName'`, `role`, or `subscriptionTier`, verify the function handles missing values safely.

Common breakage patterns:
- casting missing metadata directly to non-null types
- inserting into columns that no longer exist
- assuming a profile table schema that changed manually in production

## Fast Isolation Test

If you find a custom trigger on `auth.users`, temporarily disable it only long enough to confirm the root cause.

```sql
alter table auth.users disable trigger your_trigger_name;
```

Then retry a test signup or `auth.admin.create_user` from the dashboard or your live app.

If signup suddenly works, the trigger function is the root cause.

Re-enable it immediately after the test:

```sql
alter table auth.users enable trigger your_trigger_name;
```

Do not leave it disabled longer than needed.

## Most Common Fixes

### Trigger writes to a table with new required columns

Fix by either:
- making the new columns nullable/defaulted, or
- updating the trigger function to populate them

### Trigger references dropped or renamed columns

Fix the trigger function definition to match the current production schema.

### Trigger assumes profile metadata always exists

Use safe defaults, for example:

```sql
coalesce(new.raw_user_meta_data ->> 'role', 'artist')
```

### Trigger runs with wrong privileges

Use a `security definer` function owned by a role that can insert into the target table, and set a safe search path.

## Minimal Safe Trigger Pattern

If you need to rewrite the live trigger, this pattern is the safe baseline:

```sql
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  return new;
exception
  when others then
    raise;
end;
$$;
```

Then attach it explicitly to `auth.users`.

## App Impact Summary

Current app behavior while this is broken:
- existing users can log in
- label-to-existing-artist linking still works
- new artist creation from label dashboard cannot complete
- any flow that depends on creating a brand new auth user will fail

## Recommended Order

1. Inspect Auth and Postgres logs for the failing signup.
2. Enumerate triggers on `auth.users`.
3. Inspect the trigger function body.
4. Verify the target table schema and constraints.
5. Temporarily disable the trigger to prove causality if needed.
6. Patch the trigger or target schema.
7. Retry live artist creation from the label dashboard.
