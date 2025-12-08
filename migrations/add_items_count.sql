-- Add items_count column to daily_cashflow table
-- This column stores the total number of products/items sold per day (from WooCommerce line_items)

ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0;

-- Comment on the column
COMMENT ON COLUMN daily_cashflow.items_count IS 'Total number of products/items sold on this day (sum of all line_items quantities from WooCommerce orders)';
