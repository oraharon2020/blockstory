-- Google Ads Full Integration Migration
-- Run this in Supabase SQL Editor

-- 1. Update campaigns table with more fields
ALTER TABLE google_ads_campaigns 
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS impression_share DECIMAL(5,2) DEFAULT 0;

-- 2. Create ad groups table
CREATE TABLE IF NOT EXISTS google_ads_ad_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    ad_group_id TEXT NOT NULL,
    ad_group_name TEXT NOT NULL,
    status TEXT,
    date DATE NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, ad_group_id, date)
);

-- 3. Create keywords table
CREATE TABLE IF NOT EXISTS google_ads_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    ad_group_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    match_type TEXT NOT NULL,
    quality_score INTEGER DEFAULT 0,
    date DATE NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, keyword, match_type, date)
);

-- 4. Create search terms table
CREATE TABLE IF NOT EXISTS google_ads_search_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    query TEXT NOT NULL,
    date DATE NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, query, date)
);

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_ads_ad_groups_business_date ON google_ads_ad_groups(business_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_keywords_business_date ON google_ads_keywords(business_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_search_terms_business_date ON google_ads_search_terms(business_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_keywords_cost ON google_ads_keywords(cost DESC);
CREATE INDEX IF NOT EXISTS idx_google_ads_search_terms_cost ON google_ads_search_terms(cost DESC);

-- 6. Enable RLS
ALTER TABLE google_ads_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_search_terms ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies (similar to campaigns)
CREATE POLICY "Users can view their own ad groups" ON google_ads_ad_groups
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own ad groups" ON google_ads_ad_groups
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own ad groups" ON google_ads_ad_groups
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own keywords" ON google_ads_keywords
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own keywords" ON google_ads_keywords
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own keywords" ON google_ads_keywords
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own search terms" ON google_ads_search_terms
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own search terms" ON google_ads_search_terms
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own search terms" ON google_ads_search_terms
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM business_settings WHERE user_id = auth.uid()
        )
    );

-- 8. Service role bypass for webhook
CREATE POLICY "Service role can manage ad groups" ON google_ads_ad_groups
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage keywords" ON google_ads_keywords
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage search terms" ON google_ads_search_terms
    FOR ALL USING (auth.role() = 'service_role');
