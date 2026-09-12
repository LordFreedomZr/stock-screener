-- Drop existing policy first
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  last_seen TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_seen column if table already exists but missing it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE user_profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON user_profiles FOR ALL USING (true);

-- Insert profile for existing users (skip duplicates)
INSERT INTO user_profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
