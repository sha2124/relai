-- Journal Entries Schema
-- Run this in the Supabase SQL Editor

create table if not exists journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  mood text check (mood in ('great', 'good', 'okay', 'tough', 'hard')),
  tags text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_journal_entries_user_id on journal_entries (user_id);
create index if not exists idx_journal_entries_created_at on journal_entries (created_at desc);

alter table journal_entries enable row level security;

create policy "Users can read own journal entries"
  on journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can create own journal entries"
  on journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own journal entries"
  on journal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own journal entries"
  on journal_entries for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_journal_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger journal_entries_updated_at
  before update on journal_entries
  for each row
  execute function update_journal_entries_updated_at();
