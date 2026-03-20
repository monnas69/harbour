-- Migration: 002_stripe_subscription_id
-- Adds stripe_subscription_id to profiles for subscription tracking.

alter table profiles
  add column if not exists stripe_subscription_id text;
