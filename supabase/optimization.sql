-- Database Optimization for Stock Screener
-- Run this in Supabase SQL Editor AFTER migration 005

-- ============================================================
-- 1. COMPOSITE INDEXES (Query Performance)
-- ============================================================

-- Threshold configs: lookup by user (most common query)
CREATE INDEX IF NOT EXISTS idx_threshold_configs_user_id ON threshold_configs(user_id);

-- Watchlist items: lookup by user + status
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id_status ON watchlist_items(user_id, status);

-- Watchlist evaluations: lookup by user + ticker
CREATE INDEX IF NOT EXISTS idx_watchlist_evaluations_ticker_timestamp ON watchlist_evaluations(ticker, timestamp DESC);

-- Screening results: lookup by direction + score (dashboard filter)
CREATE INDEX IF NOT EXISTS idx_screening_results_direction_score ON screening_results(direction, score DESC);

-- Price snapshots: lookup by ticker only (for charts)
CREATE INDEX IF NOT EXISTS idx_price_snapshots_ticker ON price_snapshots(ticker);

-- ============================================================
-- 2. RLS POLICIES (User Isolation - Service Role Bypasses)
-- ============================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "watchlist_select" ON watchlist_items;
DROP POLICY IF EXISTS "watchlist_insert" ON watchlist_items;
DROP POLICY IF EXISTS "watchlist_update" ON watchlist_items;
DROP POLICY IF EXISTS "configs_select" ON threshold_configs;

-- Watchlist: user can only see own items
CREATE POLICY "watchlist_select_user" ON watchlist_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "watchlist_insert_user" ON watchlist_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "watchlist_update_user" ON watchlist_items
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "watchlist_delete_user" ON watchlist_items
  FOR DELETE USING (user_id = auth.uid());

-- Service role full access (bypasses RLS)
CREATE POLICY "watchlist_service_all" ON watchlist_items
  FOR ALL USING (auth.role() = 'service_role');

-- Threshold configs: user can only see own config
CREATE POLICY "configs_select_user" ON threshold_configs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "configs_insert_user" ON threshold_configs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "configs_update_user" ON threshold_configs
  FOR UPDATE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "configs_service_all" ON threshold_configs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. ANALYZE (Update Table Statistics)
-- ============================================================

ANALYZE threshold_configs;
ANALYZE watchlist_items;
ANALYZE screening_results;
ANALYZE watchlist_evaluations;
