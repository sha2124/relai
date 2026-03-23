-- Fix: Two RLS gaps preventing the partner page from showing linked state
-- Run this in the Supabase SQL Editor.

-- ── Fix 1: partner_links ──
-- Invited partners (partner_id) need to read the link row to see linked state.
drop policy if exists "Partners can read their links" on partner_links;

create policy "Partners can read their links"
  on partner_links for select
  using (auth.uid() = partner_id);

-- ── Fix 2: profiles ──
-- Linked partners need to read each other's profiles (name, archetype) for
-- the side-by-side comparison. Without this, partnerArchetype is always null.
-- The subquery ensures only linked partners can cross-read — not any user.
drop policy if exists "Linked partners can read each other profiles" on profiles;

create policy "Linked partners can read each other profiles"
  on profiles for select
  using (
    exists (
      select 1 from partner_links
      where status = 'linked'
        and (
          (user_id = auth.uid() and partner_id = profiles.user_id)
          or
          (partner_id = auth.uid() and user_id = profiles.user_id)
        )
    )
  );
