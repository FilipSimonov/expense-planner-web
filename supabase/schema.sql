-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- Every table has a user_id defaulting to the logged-in user, with Row Level
-- Security policies that only let a user read/write their own rows. This is
-- what makes multi-user accounts safe: even if someone tampered with the
-- app's requests, the database itself refuses to return or accept another
-- user's data.
-- Run wher creating the SQL

create extension if not exists "pgcrypto";

create table if not exists months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  closed boolean not null default false,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month_id uuid not null references months (id) on delete cascade,
  category text not null,
  source text default '',
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month_id uuid not null references months (id) on delete cascade,
  category text not null,
  note text default '',
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists savings_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default '$'
);

alter table months enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;
alter table savings_accounts enable row level security;
alter table user_settings enable row level security;

-- RLS policies restrict *which rows* a user can touch, but Postgres also
-- requires a base grant allowing the role to touch the table at all.
-- Supabase's Table Editor UI adds these automatically for tables you create
-- there, but tables created via raw SQL (like this file) don't get them for
-- free — without this, every query fails with "permission denied" even
-- though the RLS policies below are correct.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "own months" on months for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own income" on income for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own savings_accounts" on savings_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own user_settings" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
