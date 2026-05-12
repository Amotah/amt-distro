-- ─────────────────────────────────────────────────────────────────────────────
-- user_notifications table
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null default 'info',   -- 'info' | 'release' | 'earnings' | 'news' | 'promo' | 'alert'
  link        text,                            -- optional dashboard path, e.g. '/dashboard/releases'
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries (newest first)
create index if not exists idx_user_notifications_user_id_created
  on public.user_notifications (user_id, created_at desc);

-- Row-level security: users can only see & update their own notifications
alter table public.user_notifications enable row level security;

create policy "Users can view own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications as read"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (Edge Functions) can insert notifications for any user
create policy "Service role can insert notifications"
  on public.user_notifications for insert
  with check (true);  -- enforced by service_role key on the backend

-- Enable Realtime so the dashboard bell updates instantly
alter publication supabase_realtime add table public.user_notifications;
