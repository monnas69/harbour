-- Migration: 001_profiles
-- Creates the profiles table for Harbour Plus tier management.
-- Run this in the Supabase SQL editor before deploying the paid-user feature.

create table if not exists profiles (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  is_plus            boolean     not null default false,
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

-- Row-level security
alter table profiles enable row level security;

-- Users can read their own profile
create policy "profiles: user can read own"
  on profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile (created on first dashboard load)
create policy "profiles: user can insert own"
  on profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile (display prefs — NOT is_plus/stripe fields)
-- is_plus and stripe_customer_id are updated only by service-role (Stripe webhook)
create policy "profiles: user can update own"
  on profiles for update
  using (auth.uid() = id);
