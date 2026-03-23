-- Partner Linking Schema
-- Run this in the Supabase SQL Editor to create the partner_links table

create table if not exists partner_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  partner_id uuid references auth.users(id) on delete set null,
  invite_code text unique not null,
  status text not null default 'pending' check (status in ('pending', 'linked')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index on invite_code for fast lookups
create index if not exists idx_partner_links_invite_code on partner_links (invite_code);

-- Index on user_id for quick ownership lookups
create index if not exists idx_partner_links_user_id on partner_links (user_id);

-- Index on partner_id for quick partner lookups
create index if not exists idx_partner_links_partner_id on partner_links (partner_id);

-- Enable RLS
alter table partner_links enable row level security;

-- Policy: users can read their own links (as creator)
create policy "Users can read own links"
  on partner_links for select
  using (auth.uid() = user_id);

-- Policy: users can read links where they are the partner
create policy "Partners can read their links"
  on partner_links for select
  using (auth.uid() = partner_id);

-- Policy: users can insert their own links
create policy "Users can create own links"
  on partner_links for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own links
create policy "Users can update own links"
  on partner_links for update
  using (auth.uid() = user_id);

-- Policy: partners can update links to accept (link themselves)
create policy "Partners can accept links"
  on partner_links for update
  using (auth.uid() = partner_id OR partner_id is null);

-- Auto-update updated_at
create or replace function update_partner_links_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger partner_links_updated_at
  before update on partner_links
  for each row
  execute function update_partner_links_updated_at();
