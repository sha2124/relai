create table mediation_sessions (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references auth.users(id) on delete cascade not null,
  user2_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  topic text, -- what they're working through
  summary text, -- AI-generated summary at end
  created_at timestamptz default now(),
  ended_at timestamptz
);

create table mediation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references mediation_sessions(id) on delete cascade not null,
  sender_id uuid, -- null means AI mediator
  sender_role text not null check (sender_role in ('partner1', 'partner2', 'mediator')),
  content text not null,
  created_at timestamptz default now()
);

alter table mediation_sessions enable row level security;
alter table mediation_messages enable row level security;

-- Users can read/create sessions they're part of
create policy "Users can read own mediation sessions" on mediation_sessions for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Users can create mediation sessions" on mediation_sessions for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Users can update own mediation sessions" on mediation_sessions for update
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Users can read/insert messages for sessions they're part of
create policy "Users can read mediation messages" on mediation_messages for select
  using (exists (select 1 from mediation_sessions s where s.id = session_id and (s.user1_id = auth.uid() or s.user2_id = auth.uid())));
create policy "Users can insert mediation messages" on mediation_messages for insert
  with check (exists (select 1 from mediation_sessions s where s.id = session_id and (s.user1_id = auth.uid() or s.user2_id = auth.uid())));

create index mediation_messages_session on mediation_messages (session_id, created_at);
create index mediation_sessions_users on mediation_sessions (user1_id, user2_id);
