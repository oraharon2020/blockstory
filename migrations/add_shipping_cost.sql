-- Migration: Add manual shipping cost per item feature
-- Run this in Supabase SQL Editor

-- Add manual_shipping_per_item column to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS manual_shipping_per_item BOOLEAN DEFAULT false;

-- Add charge_shipping_on_free_orders column to business_settings
-- When true, fixed shipping cost is charged even on "free shipping" orders
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS charge_shipping_on_free_orders BOOLEAN DEFAULT true;

-- Add shipping_cost column to order_item_costs
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2);

-- Optional: Add comment for documentation
COMMENT ON COLUMN business_settings.manual_shipping_per_item IS 'When true, allows manual shipping cost input per item instead of automatic from WooCommerce';
COMMENT ON COLUMN business_settings.charge_shipping_on_free_orders IS 'When true and fixed shipping cost is set, charge shipping even on free shipping orders';
COMMENT ON COLUMN order_item_costs.shipping_cost IS 'Manual shipping cost per item when manual_shipping_per_item is enabled';
