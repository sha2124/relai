create table conflict_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  partner_id uuid references auth.users(id),
  patterns jsonb not null,
  four_horsemen jsonb, -- { criticism: 3, contempt: 0, defensiveness: 5, stonewalling: 1 }
  escalation_score integer check (escalation_score >= 0 and escalation_score <= 100),
  summary text not null,
  analyzed_at timestamptz default now()
);

alter table conflict_patterns enable row level security;
create policy "Users can read own conflict patterns" on conflict_patterns for select using (auth.uid() = user_id);
create policy "Users can insert own conflict patterns" on conflict_patterns for insert with check (auth.uid() = user_id);
create index conflict_patterns_user on conflict_patterns (user_id, analyzed_at desc);
