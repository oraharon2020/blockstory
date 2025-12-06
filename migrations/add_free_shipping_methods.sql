-- Add free_shipping_methods column to business_settings table
-- This stores shipping methods that should not be charged (like pickup)

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS free_shipping_methods TEXT[] DEFAULT ARRAY['local_pickup'];

-- Update existing records with default value
UPDATE business_settings 
SET free_shipping_methods = ARRAY['local_pickup'] 
WHERE free_shipping_methods IS NULL;
