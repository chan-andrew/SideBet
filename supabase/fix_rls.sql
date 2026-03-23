-- Run this in Supabase SQL Editor if you see RLS policy errors.
-- The anon role needs explicit table grants in addition to RLS policies.

-- Grant full write access to the anon role on all app tables
grant all privileges on public.users to anon;
grant all privileges on public.parties to anon;
grant all privileges on public.party_members to anon;
grant all privileges on public.lines to anon;
grant all privileges on public.positions to anon;

-- Also grant on sequences (needed for inserts on tables with sequences)
grant usage, select on all sequences in schema public to anon;

-- If you hit "policy already exists" errors from schema.sql, drop old ones first:
-- drop policy if exists "anon_all" on public.users;
-- drop policy if exists "anon_all" on public.parties;
-- drop policy if exists "anon_all" on public.party_members;
-- drop policy if exists "anon_all" on public.lines;
-- drop policy if exists "anon_all" on public.positions;
