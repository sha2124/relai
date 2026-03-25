create table commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  commitment_text text not null,
  context text,
  detected_at timestamptz default now(),
  follow_up_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'followed_up', 'completed', 'skipped')),
  outcome text,
  created_at timestamptz default now()
);

alter table commitments enable row level security;
create policy "Users can read own commitments" on commitments for select using (auth.uid() = user_id);
create policy "Users can insert own commitments" on commitments for insert with check (auth.uid() = user_id);
create policy "Users can update own commitments" on commitments for update using (auth.uid() = user_id);
create index commitments_user_status on commitments (user_id, status, follow_up_at);
