-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Profiles table — stores computed quiz results
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  relationship_status text,
  relationship_length text,
  attachment_style jsonb not null,
  communication_style jsonb not null,
  conflict_response jsonb not null,
  love_language jsonb not null,
  goal text,
  goal_label text,
  scores jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Messages table — stores conversation history
create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 3. Enable Row Level Security
alter table profiles enable row level security;
alter table messages enable row level security;

-- 4. Policies — users can only access their own data
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

create policy "Users can read own messages"
  on messages for select using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on messages for insert with check (auth.uid() = user_id);

-- 5. Index for fast message retrieval
create index messages_user_id_created_at on messages (user_id, created_at);
