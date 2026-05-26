-- BASA Shift multi-tenant workspace schema
-- Run this in Supabase SQL Editor after enabling Auth.

create table if not exists public.basa_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  venue jsonb not null default '{}'::jsonb,
  employees jsonb not null default '[]'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.basa_workspaces enable row level security;

drop policy if exists "Owners can read their BASA workspace" on public.basa_workspaces;
create policy "Owners can read their BASA workspace"
on public.basa_workspaces
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Owners can insert their BASA workspace" on public.basa_workspaces;
create policy "Owners can insert their BASA workspace"
on public.basa_workspaces
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their BASA workspace" on public.basa_workspaces;
create policy "Owners can update their BASA workspace"
on public.basa_workspaces
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create table if not exists public.basa_chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('bot', 'owner')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.basa_chat_messages enable row level security;

drop policy if exists "Owners can read their BASA chat messages" on public.basa_chat_messages;
create policy "Owners can read their BASA chat messages"
on public.basa_chat_messages
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Owners can insert their BASA chat messages" on public.basa_chat_messages;
create policy "Owners can insert their BASA chat messages"
on public.basa_chat_messages
for insert
to authenticated
with check (auth.uid() = owner_id);
