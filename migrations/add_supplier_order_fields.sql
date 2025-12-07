-- Migration: Add supplier order management fields to order_item_costs
-- Run this in Supabase SQL Editor

-- Add adjusted_cost field - for order-specific price adjustments (different from default product cost)
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS adjusted_cost DECIMAL(10,2) DEFAULT NULL;

-- Add is_ready field - to mark items as ready/prepared
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT FALSE;

-- Add notes field - for supplier-specific notes per item
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Add index for faster supplier queries
CREATE INDEX IF NOT EXISTS idx_order_item_costs_supplier_name 
ON order_item_costs(supplier_name);

CREATE INDEX IF NOT EXISTS idx_order_item_costs_is_ready 
ON order_item_costs(is_ready);

CREATE INDEX IF NOT EXISTS idx_order_item_costs_order_date 
ON order_item_costs(order_date);

-- Comment explaining the fields
COMMENT ON COLUMN order_item_costs.adjusted_cost IS 'Order-specific adjusted cost (overrides default product cost for this order only)';
COMMENT ON COLUMN order_item_costs.is_ready IS 'Whether this item has been marked as ready/prepared by supplier';
COMMENT ON COLUMN order_item_costs.notes IS 'Notes for the supplier regarding this specific item';
