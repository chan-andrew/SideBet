-- ============================================================
-- SideBet Schema (local identity, no Supabase Auth)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Users (standalone, no auth.users dependency)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text unique not null,
  created_at timestamptz default now() not null
);

-- Parties (friend groups)
create table if not exists public.parties (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references public.users(id) on delete cascade not null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex') not null,
  created_at timestamptz default now() not null
);

-- Party Members (join table)
create table if not exists public.party_members (
  party_id uuid references public.parties(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  primary key (party_id, user_id)
);

-- Lines (the actual bets/predictions)
create table if not exists public.lines (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  bet_type text not null check (bet_type in ('yes_no', 'over_under')),
  over_under_number numeric,
  wager_amount numeric not null check (wager_amount > 0),
  created_by uuid references public.users(id) on delete cascade not null,
  party_id uuid references public.parties(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  outcome text check (outcome in ('yes', 'no', 'over', 'under')),
  deadline timestamptz not null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex') not null,
  created_at timestamptz default now() not null
);

-- Positions (who bet what on which side)
create table if not exists public.positions (
  id uuid default gen_random_uuid() primary key,
  line_id uuid references public.lines(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  side text not null check (side in ('yes', 'no', 'over', 'under')),
  amount numeric not null check (amount > 0),
  created_at timestamptz default now() not null,
  unique (line_id, user_id)
);

-- ============================================================
-- ACCESS CONTROL
-- No Supabase Auth — disable RLS, grant full anon access
-- ============================================================

-- Grant table-level access to anon role
grant all privileges on public.users to anon;
grant all privileges on public.parties to anon;
grant all privileges on public.party_members to anon;
grant all privileges on public.lines to anon;
grant all privileges on public.positions to anon;
grant usage, select on all sequences in schema public to anon;

-- Disable RLS entirely (no auth.uid() available, app enforces logic client-side)
alter table public.users disable row level security;
alter table public.parties disable row level security;
alter table public.party_members disable row level security;
alter table public.lines disable row level security;
alter table public.positions disable row level security;

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.positions;
alter publication supabase_realtime add table public.lines;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-add party creator as member
create or replace function public.add_party_creator_as_member()
returns trigger as $$
begin
  insert into public.party_members (party_id, user_id)
  values (new.id, new.created_by);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_party_created
  after insert on public.parties
  for each row execute function public.add_party_creator_as_member();
