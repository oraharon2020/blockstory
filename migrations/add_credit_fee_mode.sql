-- Add credit_fee_mode column to business_settings
-- Values: 'percentage' (default) - calculate from revenue percentage
--         'manual' - allow manual input per day

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS credit_fee_mode TEXT DEFAULT 'percentage';

-- Add comment
COMMENT ON COLUMN business_settings.credit_fee_mode IS 'Credit fee calculation mode: percentage (auto calculate) or manual (user input per day)';
