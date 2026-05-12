create extension if not exists pgcrypto;

create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  plan_id text not null check (plan_id in ('1-week', '2-weeks', '4-weeks')),
  plan_name text not null,
  amount integer not null check (amount > 0),
  display_price text not null,
  purchased_at date not null,
  expires_at date not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'completed')),
  release_title text not null,
  artist_name text not null,
  release_id text,
  release_image_url text,
  release_type text,
  release_genre text,
  payment_reference text unique,
  admin_approval_status text not null default 'pending' check (admin_approval_status in ('pending', 'approved')),
  approved_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promotion_campaigns(id) on delete cascade,
  name text not null,
  type text not null check (type in ('video', 'banner', 'graphic')),
  sort_order integer not null default 0,
  storage_bucket text,
  storage_path text,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promotion_campaigns_user_id on public.promotion_campaigns(user_id);
create index if not exists idx_promotion_campaigns_status on public.promotion_campaigns(status);
create index if not exists idx_promotion_campaigns_payment_reference on public.promotion_campaigns(payment_reference);
create index if not exists idx_promotion_assets_campaign_id on public.promotion_assets(campaign_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists trg_promotion_campaigns_updated_at on public.promotion_campaigns;
create trigger trg_promotion_campaigns_updated_at
before update on public.promotion_campaigns
for each row execute function public.set_updated_at();

 drop trigger if exists trg_promotion_assets_updated_at on public.promotion_assets;
create trigger trg_promotion_assets_updated_at
before update on public.promotion_assets
for each row execute function public.set_updated_at();
