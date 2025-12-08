-- Add Google Ads settings columns to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_ads_webhook_secret TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_ads_auto_sync BOOLEAN DEFAULT false;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT;

-- Create table for Google Ads campaigns data
CREATE TABLE IF NOT EXISTS google_ads_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  date DATE NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  conversions DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, campaign_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_business_date 
ON google_ads_campaigns(business_id, date);

-- Enable RLS
ALTER TABLE google_ads_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "google_ads_campaigns_policy" ON google_ads_campaigns
FOR ALL USING (true);
