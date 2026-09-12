-- Add group_name column to watchlist_items for multiple watchlists
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Default';

-- Create index for group queries
CREATE INDEX IF NOT EXISTS idx_watchlist_items_group ON watchlist_items(user_id, group_name);

-- Migrate existing items to 'Default' group
UPDATE watchlist_items SET group_name = 'Default' WHERE group_name IS NULL;
