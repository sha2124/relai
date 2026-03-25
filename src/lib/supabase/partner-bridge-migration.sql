-- Partner Bridge: shared couple insights table
create table partner_insights (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null,
  user1_id uuid references auth.users(id) on delete cascade not null,
  user2_id uuid references auth.users(id) on delete cascade not null,
  insights jsonb not null,
  compatibility_score integer check (compatibility_score >= 0 and compatibility_score <= 100),
  summary text,
  next_conversation text,
  generated_at timestamptz default now()
);

alter table partner_insights enable row level security;

create policy "Users can read own partner insights" on partner_insights for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Users can insert partner insights" on partner_insights for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

create index partner_insights_users on partner_insights (user1_id, user2_id, generated_at desc);

-- Allow linked partners to read each other's profiles
create policy "Linked partners can read each other profiles" on profiles for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from partner_links
      where status = 'linked'
      and (
        (user_id = auth.uid() and partner_id = profiles.user_id)
        or (partner_id = auth.uid() and user_id = profiles.user_id)
      )
    )
  );
