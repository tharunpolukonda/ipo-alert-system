-- ═══════════════════════════════════════════════════════════════════
-- IPO Tracker — Supabase Schema (with Auth + RLS)
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- ─── 0. CLEAN SLATE (safe to re-run) ─────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.alert_rules cascade;
drop table if exists public.ipos cascade;
drop table if exists public.sectors cascade;
drop table if exists public.user_profiles cascade;

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── 1. USER PROFILES ─────────────────────────────────────────────
-- Auto-created when a new user signs up via Supabase Auth
create table public.user_profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique not null,
  email      text,
  created_at timestamptz default now()
);

-- ─── 2. SECTORS ───────────────────────────────────────────────────
-- Global — any authenticated user can view or create sectors
create table public.sectors (
  id         uuid default gen_random_uuid() primary key,
  name       text not null unique,
  created_at timestamptz default now()
);

-- ─── 3. IPOS ──────────────────────────────────────────────────────
-- Per-user — each IPO belongs to the user who added it
create table public.ipos (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.user_profiles(id) on delete cascade not null,
  company_name        text not null,
  sector_id           uuid references public.sectors(id) on delete set null,
  sector_name         text,
  portfolio           boolean not null default false,
  no_of_shares        numeric,
  buy_price           numeric,
  groww_link          text,
  listed_on           text,
  issue_price         text,
  listing_price       text,
  issue_size          text,
  qib_subscription    text,
  nii_subscription    text,
  rii_subscription    text,
  total_subscription  text,
  created_at          timestamptz default now(),
  updated_at          timestamptz
);

-- ─── 4. ALERT RULES ───────────────────────────────────────────────
-- Per-user — each alert rule belongs to the user who set it
create table public.alert_rules (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.user_profiles(id) on delete cascade not null,
  type         text not null check (type in ('base', 'sector', 'company')),
  sector_id    uuid references public.sectors(id) on delete cascade,
  sector_name  text,
  company_name text,
  gain_pct     numeric not null default 15.0,
  loss_pct     numeric not null default -15.0,
  created_at   timestamptz default now(),
  updated_at   timestamptz
);

-- Only one base rule per user
create unique index alert_rules_base_per_user
  on public.alert_rules (user_id, type)
  where type = 'base';

-- ─── 5. INDEXES ───────────────────────────────────────────────────
create index idx_ipos_user_id      on public.ipos(user_id);
create index idx_ipos_portfolio    on public.ipos(user_id, portfolio);
create index idx_ipos_created_at   on public.ipos(created_at desc);
create index idx_alert_rules_user  on public.alert_rules(user_id, type);
create index idx_sectors_name      on public.sectors(name);

-- ─── 6. AUTO-CREATE PROFILE TRIGGER ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 7. ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.user_profiles enable row level security;
alter table public.sectors       enable row level security;
alter table public.ipos          enable row level security;
alter table public.alert_rules   enable row level security;

-- USER PROFILES
-- Allow anyone (anon+authenticated) to SELECT profiles so that
-- the login page can look up a user's email from their username
create policy "Public read profiles"
  on public.user_profiles for select using (true);

create policy "Users update own profile"
  on public.user_profiles for update using (auth.uid() = id);

-- SECTORS — global read, authenticated write
create policy "Authenticated view sectors"
  on public.sectors for select to authenticated using (true);

create policy "Authenticated insert sectors"
  on public.sectors for insert to authenticated with check (true);

create policy "Authenticated update sectors"
  on public.sectors for update to authenticated using (true);

create policy "Authenticated delete sectors"
  on public.sectors for delete to authenticated using (true);

-- IPOS — full CRUD scoped to owner
create policy "Users view own ipos"
  on public.ipos for select using (auth.uid() = user_id);

create policy "Users insert own ipos"
  on public.ipos for insert with check (auth.uid() = user_id);

create policy "Users update own ipos"
  on public.ipos for update using (auth.uid() = user_id);

create policy "Users delete own ipos"
  on public.ipos for delete using (auth.uid() = user_id);

-- ALERT RULES — full CRUD scoped to owner
create policy "Users view own alert_rules"
  on public.alert_rules for select using (auth.uid() = user_id);

create policy "Users insert own alert_rules"
  on public.alert_rules for insert with check (auth.uid() = user_id);

create policy "Users update own alert_rules"
  on public.alert_rules for update using (auth.uid() = user_id);

create policy "Users delete own alert_rules"
  on public.alert_rules for delete using (auth.uid() = user_id);

-- ─── DONE ─────────────────────────────────────────────────────────
-- Tables created: user_profiles, sectors, ipos, alert_rules
-- Auth trigger: auto-creates user_profiles row on signup
-- RLS: users can only access their own ipos and alert_rules
-- Sectors: shared across all authenticated users
-- Backend (service_role key) bypasses all RLS automatically
