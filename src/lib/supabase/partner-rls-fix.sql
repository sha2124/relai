-- Fix: Allow authenticated users to read pending partner links (for join flow)
-- The invite code is a UUID so it's unguessable — safe to allow reads on pending links

create policy "Authenticated users can read pending links"
  on partner_links for select
  using (auth.uid() is not null and status = 'pending');
