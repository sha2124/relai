-- Subscriptions table for Stripe billing
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly', null)),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on subscriptions for update
  using (auth.uid() = user_id);

create index subscriptions_stripe on subscriptions (stripe_customer_id);
create index subscriptions_user on subscriptions (user_id);
