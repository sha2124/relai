create table nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('follow_up', 'check_in', 'encouragement', 'exercise', 'reflection')),
  title text not null,
  content text not null,
  context text, -- what triggered this nudge
  action_type text check (action_type in ('chat', 'journal', 'exercise', 'partner', null)),
  action_label text, -- e.g. "Talk to coach about this"
  action_url text, -- e.g. "/" or "/journal"
  is_read boolean default false,
  is_dismissed boolean default false,
  created_at timestamptz default now()
);

alter table nudges enable row level security;

create policy "Users can read own nudges" on nudges for select using (auth.uid() = user_id);
create policy "Users can insert own nudges" on nudges for insert with check (auth.uid() = user_id);
create policy "Users can update own nudges" on nudges for update using (auth.uid() = user_id);

create index nudges_user_created on nudges (user_id, created_at desc);
create index nudges_user_unread on nudges (user_id, is_read, is_dismissed);
