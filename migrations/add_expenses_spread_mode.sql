-- Add expenses_spread_mode column to business_settings
-- Values: 'exact' (show on exact date) or 'spread' (spread across all month days)
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS expenses_spread_mode TEXT DEFAULT 'exact';
