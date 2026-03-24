-- Add photo and date fields to journal_entries
-- Run this in the Supabase SQL Editor

alter table journal_entries add column if not exists photo_url text;
alter table journal_entries add column if not exists entry_date date;

-- Create storage bucket for journal photos (if not exists)
insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload journal photos"
  on storage.objects for insert
  with check (
    bucket_id = 'journal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to journal photos
create policy "Public can view journal photos"
  on storage.objects for select
  using (bucket_id = 'journal-photos');
