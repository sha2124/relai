-- Run this in Supabase SQL Editor to add social/photos feature

-- 1. Add social columns to profiles (including updated_at for ordering)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at on profile changes
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

-- 2. Memories table — relationship moments with photos
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  caption text NOT NULL,
  photo_url text,
  memory_date date DEFAULT CURRENT_DATE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Reactions table — hearts on memories
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_id uuid REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, memory_id)
);

-- 4. Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- 5. Memories policies
CREATE POLICY "Users can read own memories"
  ON memories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read public memories"
  ON memories FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE USING (auth.uid() = user_id);

-- 6. Reactions policies
CREATE POLICY "Users can read reactions"
  ON reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert own reactions"
  ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE USING (auth.uid() = user_id);

-- 7. Public profiles policy (anyone can read public profiles)
CREATE POLICY "Anyone can read public profiles"
  ON profiles FOR SELECT USING (is_public = true);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS memories_user_id_created_at ON memories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reactions_memory_id ON reactions (memory_id);
CREATE INDEX IF NOT EXISTS profiles_username ON profiles (username);

-- 9. Storage bucket: avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public avatar access"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 10. Storage bucket: memory-photos
INSERT INTO storage.buckets (id, name, public) VALUES ('memory-photos', 'memory-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own memory photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public memory photo access"
  ON storage.objects FOR SELECT USING (bucket_id = 'memory-photos');

CREATE POLICY "Users can delete own memory photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
