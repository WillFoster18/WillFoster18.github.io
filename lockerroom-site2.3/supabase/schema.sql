-- LockerRoom database schema for Supabase (Postgres)
-- ----------------------------------------------------
-- How to use this file:
-- 1. Create a free project at https://supabase.com
-- 2. Open your project's SQL Editor
-- 3. Paste this entire file in and run it
-- 4. Go to Project Settings -> API and copy your Project URL and anon/public key
--    into js/config.js (see that file for instructions)

-- Racer profiles (one per user, feeds the Fit Confidence engine)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  discipline text,
  preferred_length_cm numeric,
  boot_last_width_mm numeric,
  desired_flex numeric,
  chest_cm numeric,
  waist_cm numeric,
  is_verified_team boolean default false,
  created_at timestamptz default now()
);

-- Listings
create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users on delete cascade not null,
  seller_name text not null,
  category text not null,
  name text not null,
  meta text,
  price numeric not null,
  location text,
  has_proof_run boolean default false,
  -- specs: array of [label, value] pairs shown on the listing page
  specs jsonb default '[]'::jsonb,
  -- raw: structured fields the Fit Confidence engine scores against
  -- e.g. {"category":"Skis","discipline":"Giant Slalom","lengthCm":165,"racesUsed":18}
  raw jsonb default '{}'::jsonb,
  status text default 'active', -- active | sold | removed
  created_at timestamptz default now()
);

-- Proof Run videos, linked to a listing
create table if not exists proof_runs (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references listings on delete cascade not null,
  seller_id uuid references auth.users on delete cascade not null,
  video_url text not null,
  created_at timestamptz default now()
);

-- ---------- Row Level Security ----------
-- This is what keeps one user from editing another user's data,
-- even though the anon key is public. Don't skip this section.

alter table profiles enable row level security;
alter table listings enable row level security;
alter table proof_runs enable row level security;

-- Profiles: anyone can view (needed to show seller info), only the
-- owner can insert/update their own row.
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Listings: anyone can view active listings; only the seller can
-- create, update, or delete their own.
create policy "Listings are viewable by everyone"
  on listings for select using (true);
create policy "Sellers can insert their own listings"
  on listings for insert with check (auth.uid() = seller_id);
create policy "Sellers can update their own listings"
  on listings for update using (auth.uid() = seller_id);
create policy "Sellers can delete their own listings"
  on listings for delete using (auth.uid() = seller_id);

-- Proof runs: anyone can view; only the seller can add one to their listing.
create policy "Proof runs are viewable by everyone"
  on proof_runs for select using (true);
create policy "Sellers can insert their own proof runs"
  on proof_runs for insert with check (auth.uid() = seller_id);

-- ---------- Storage ----------
-- Run this too — it creates the bucket Proof Run videos upload into.
insert into storage.buckets (id, name, public)
values ('proof-runs', 'proof-runs', true)
on conflict (id) do nothing;

create policy "Proof run videos are publicly readable"
  on storage.objects for select using (bucket_id = 'proof-runs');
create policy "Authenticated users can upload proof run videos"
  on storage.objects for insert with check (bucket_id = 'proof-runs' and auth.role() = 'authenticated');
