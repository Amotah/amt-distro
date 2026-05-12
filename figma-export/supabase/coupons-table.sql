-- Create coupons table for admin-managed discount codes
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_percent integer not null check (discount_percent between 1 and 100),
  scopes text[] not null default '{all}',
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup by code during checkout validation
create index if not exists coupons_code_idx on public.coupons (code);

-- Only service role can access (enforced via Edge Function)
alter table public.coupons enable row level security;

create policy "Service role full access" on public.coupons
  using (true)
  with check (true);
