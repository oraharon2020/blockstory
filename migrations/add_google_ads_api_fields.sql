-- Add Google Ads API OAuth fields to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT;

-- Comment: Run this migration to add support for Google Ads API OAuth connection
