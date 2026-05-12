create table if not exists public.contract_workspaces (
  owner_user_id text primary key,
  contract_code text not null unique,
  status text not null check (status in ('draft', 'pending-counterparty', 'signed')),
  locked_at timestamptz,
  executed_by text check (executed_by in ('artist', 'label')),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_workspaces_contract_code on public.contract_workspaces (contract_code);
create index if not exists idx_contract_workspaces_status on public.contract_workspaces (status);

alter table public.contract_workspaces enable row level security;

create policy contract_workspaces_owner_select
on public.contract_workspaces
for select
using (
  auth.uid()::text = owner_user_id
  or auth.role() = 'authenticated'
);

create policy contract_workspaces_owner_insert
on public.contract_workspaces
for insert
with check (
  auth.uid()::text = owner_user_id
  or auth.role() = 'authenticated'
);

create policy contract_workspaces_owner_update
on public.contract_workspaces
for update
using (
  auth.uid()::text = owner_user_id
  or auth.role() = 'authenticated'
)
with check (
  auth.uid()::text = owner_user_id
  or auth.role() = 'authenticated'
);
