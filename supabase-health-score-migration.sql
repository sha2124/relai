-- Health Scores table for weekly relationship health tracking
create table health_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  dimensions jsonb not null, -- { communication: 75, emotional_safety: 80, conflict_resolution: 60, intimacy: 70, growth: 85 }
  insights text not null, -- AI-generated summary
  tips jsonb, -- Array of actionable tips
  week_start date not null,
  created_at timestamptz default now()
);

alter table health_scores enable row level security;

create policy "Users can read own health scores"
  on health_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert own health scores"
  on health_scores for insert
  with check (auth.uid() = user_id);

create index health_scores_user_week on health_scores (user_id, week_start desc);
