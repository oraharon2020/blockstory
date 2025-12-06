-- Add quantity column to order_item_costs table
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Comment explaining the column
COMMENT ON COLUMN order_item_costs.quantity IS 'Number of units for this item cost. Total cost = item_cost * quantity';
