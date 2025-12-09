-- Add Google Ads Ads table (for storing ad content)
CREATE TABLE IF NOT EXISTS google_ads_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  ad_type TEXT,
  ad_group_id TEXT,
  ad_group_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  headlines TEXT[], -- Array of headlines
  descriptions TEXT[], -- Array of descriptions
  final_urls TEXT[], -- Array of destination URLs
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, ad_id)
);

-- Add last sync timestamp to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_ads_last_sync TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_ads_business ON google_ads_ads(business_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_ads_campaign ON google_ads_ads(business_id, campaign_id);

-- Enable RLS
ALTER TABLE google_ads_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "google_ads_ads_policy" ON google_ads_ads FOR ALL USING (true);

-- Add quality_score to keywords if not exists
ALTER TABLE google_ads_keywords ADD COLUMN IF NOT EXISTS quality_score INTEGER;

-- Add conversions_value to tables if not exists
ALTER TABLE google_ads_campaigns ADD COLUMN IF NOT EXISTS conversions_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE google_ads_keywords ADD COLUMN IF NOT EXISTS conversions_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE google_ads_search_terms ADD COLUMN IF NOT EXISTS conversions_value DECIMAL(10,2) DEFAULT 0;
