-- Add user_id columns for per-user settings and watchlist
-- Run this in Supabase SQL Editor

-- Add user_id to threshold_configs
ALTER TABLE threshold_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to watchlist_items
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to watchlist_evaluations (for cascade)
ALTER TABLE watchlist_evaluations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_threshold_configs_user_id ON threshold_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_evaluations_user_id ON watchlist_evaluations(user_id);

-- Add RLS policies for user-specific access
-- Threshold configs: users can only see/modify their own
DROP POLICY IF EXISTS "configs_select" ON threshold_configs;
DROP POLICY IF EXISTS "configs_insert" ON threshold_configs;

CREATE POLICY "configs_select" ON threshold_configs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "configs_insert" ON threshold_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Watchlist items: users can only see/modify their own
DROP POLICY IF EXISTS "watchlist_select" ON watchlist_items;
DROP POLICY IF EXISTS "watchlist_insert" ON watchlist_items;
DROP POLICY IF EXISTS "watchlist_update" ON watchlist_items;

CREATE POLICY "watchlist_select" ON watchlist_items
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "watchlist_insert" ON watchlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_update" ON watchlist_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Watchlist evaluations: users can only see their own
DROP POLICY IF EXISTS "evaluations_select" ON watchlist_evaluations;
DROP POLICY IF EXISTS "evaluations_insert" ON watchlist_evaluations;

CREATE POLICY "evaluations_select" ON watchlist_evaluations
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "evaluations_insert" ON watchlist_evaluations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Migrate existing data: assign to first user (optional)
-- Uncomment if you want existing data to belong to a specific user:
-- UPDATE threshold_configs SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE watchlist_items SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE watchlist_evaluations SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
