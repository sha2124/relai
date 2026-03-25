-- Safety Alerts table for Crisis Detection Agent
-- Stores AI-detected safety concerns from user conversations and journal entries

create table safety_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  severity text not null check (severity in ('watch', 'concern', 'urgent', 'critical')),
  category text not null check (category in ('abuse', 'self_harm', 'power_imbalance', 'isolation', 'escalation', 'mental_health')),
  title text not null,
  description text not null,
  evidence text[], -- quotes/references that triggered the alert
  resources jsonb, -- relevant crisis resources
  is_acknowledged boolean default false,
  created_at timestamptz default now()
);

alter table safety_alerts enable row level security;

create policy "Users can read own safety alerts"
  on safety_alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own safety alerts"
  on safety_alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own safety alerts"
  on safety_alerts for update
  using (auth.uid() = user_id);

create index safety_alerts_user on safety_alerts (user_id, created_at desc);
create index safety_alerts_severity on safety_alerts (user_id, severity, is_acknowledged);
