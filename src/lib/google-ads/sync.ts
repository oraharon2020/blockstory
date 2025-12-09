/**
 * Google Ads Sync Service
 * סנכרון נתונים מ-Google Ads ושמירה ל-Database
 */

import { supabase } from '@/lib/supabase';
import { googleAdsRequest, listAccessibleCustomers } from './client';
import {
  getCampaignsQuery,
  getAdGroupsQuery,
  getAdsQuery,
  getKeywordsQuery,
  getSearchTermsQuery,
} from './queries';
import {
  parseCampaignsResponse,
  parseAdGroupsResponse,
  parseAdsResponse,
  parseKeywordsResponse,
  parseSearchTermsResponse,
} from './transformers';
import { GoogleAdsSyncResult, CampaignMetrics, KeywordMetrics, SearchTermMetrics, Ad } from './types';

interface SyncOptions {
  businessId: string;
  refreshToken: string;
  customerId: string;
  startDate: string;
  endDate: string;
  syncCampaigns?: boolean;
  syncAdGroups?: boolean;
  syncAds?: boolean;
  syncKeywords?: boolean;
  syncSearchTerms?: boolean;
}

/**
 * Main sync function - syncs all Google Ads data
 */
export async function syncGoogleAdsData(options: SyncOptions): Promise<GoogleAdsSyncResult> {
  const {
    businessId,
    refreshToken,
    customerId,
    startDate,
    endDate,
    syncCampaigns = true,
    syncAdGroups = true,
    syncAds = true,
    syncKeywords = true,
    syncSearchTerms = true,
  } = options;

  const result: GoogleAdsSyncResult = {
    success: true,
    syncedAt: new Date().toISOString(),
    campaigns: 0,
    adGroups: 0,
    ads: 0,
    keywords: 0,
    searchTerms: 0,
    errors: [],
  };

  try {
    // Sync campaigns
    if (syncCampaigns) {
      try {
        const campaignData = await googleAdsRequest<any[]>(
          customerId,
          getCampaignsQuery(startDate, endDate),
          refreshToken
        );
        const campaigns = parseCampaignsResponse(campaignData);
        await saveCampaigns(businessId, campaigns);
        result.campaigns = campaigns.length;
      } catch (err: any) {
        result.errors?.push(`Campaigns: ${err.message}`);
      }
    }

    // Sync ad groups
    if (syncAdGroups) {
      try {
        const adGroupData = await googleAdsRequest<any[]>(
          customerId,
          getAdGroupsQuery(startDate, endDate),
          refreshToken
        );
        const adGroups = parseAdGroupsResponse(adGroupData);
        result.adGroups = adGroups.length;
        // Note: You can add savAdGroups if needed
      } catch (err: any) {
        result.errors?.push(`Ad Groups: ${err.message}`);
      }
    }

    // Sync ads (with content)
    if (syncAds) {
      try {
        const adsData = await googleAdsRequest<any[]>(
          customerId,
          getAdsQuery(startDate, endDate),
          refreshToken
        );
        const { ads, metrics } = parseAdsResponse(adsData);
        await saveAds(businessId, ads);
        result.ads = ads.length;
      } catch (err: any) {
        result.errors?.push(`Ads: ${err.message}`);
      }
    }

    // Sync keywords
    if (syncKeywords) {
      try {
        const keywordData = await googleAdsRequest<any[]>(
          customerId,
          getKeywordsQuery(startDate, endDate),
          refreshToken
        );
        const keywords = parseKeywordsResponse(keywordData);
        await saveKeywords(businessId, keywords);
        result.keywords = keywords.length;
      } catch (err: any) {
        result.errors?.push(`Keywords: ${err.message}`);
      }
    }

    // Sync search terms
    if (syncSearchTerms) {
      try {
        const searchTermData = await googleAdsRequest<any[]>(
          customerId,
          getSearchTermsQuery(startDate, endDate),
          refreshToken
        );
        const searchTerms = parseSearchTermsResponse(searchTermData);
        await saveSearchTerms(businessId, searchTerms);
        result.searchTerms = searchTerms.length;
      } catch (err: any) {
        result.errors?.push(`Search Terms: ${err.message}`);
      }
    }

    // Update last sync time
    await supabase
      .from('business_settings')
      .update({ google_ads_last_sync: new Date().toISOString() })
      .eq('business_id', businessId);

    if (result.errors && result.errors.length > 0) {
      result.success = false;
    }

    return result;

  } catch (err: any) {
    return {
      ...result,
      success: false,
      errors: [err.message],
    };
  }
}

/**
 * Save campaigns to database
 */
async function saveCampaigns(businessId: string, campaigns: CampaignMetrics[]): Promise<void> {
  if (campaigns.length === 0) return;

  // Group by campaign and date for upsert
  const records = campaigns.map(c => ({
    business_id: businessId,
    campaign_id: c.campaignId,
    campaign_name: c.campaignName,
    date: c.date,
    cost: c.cost,
    clicks: c.clicks,
    impressions: c.impressions,
    conversions: c.conversions,
    conversions_value: c.conversionsValue,
    campaign_type: c.channelType,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('google_ads_campaigns')
      .upsert(batch, { 
        onConflict: 'business_id,campaign_id,date',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error saving campaigns batch:', error);
    }
  }
}

/**
 * Save ads (with content) to database
 */
async function saveAds(businessId: string, ads: Ad[]): Promise<void> {
  if (ads.length === 0) return;

  const records = ads.map(ad => ({
    business_id: businessId,
    ad_id: ad.id,
    ad_type: ad.type,
    ad_group_id: ad.adGroupId,
    ad_group_name: ad.adGroupName,
    campaign_id: ad.campaignId,
    campaign_name: ad.campaignName,
    headlines: ad.headlines,
    descriptions: ad.descriptions,
    final_urls: ad.finalUrls,
    status: ad.status,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('google_ads_ads')
      .upsert(batch, { 
        onConflict: 'business_id,ad_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error saving ads batch:', error);
    }
  }
}

/**
 * Save keywords to database
 */
async function saveKeywords(businessId: string, keywords: KeywordMetrics[]): Promise<void> {
  if (keywords.length === 0) return;

  const records = keywords.map(k => ({
    business_id: businessId,
    keyword: k.keyword,
    match_type: k.matchType,
    ad_group_id: k.adGroupId,
    campaign_id: k.campaignId,
    date: k.date,
    cost: k.cost,
    clicks: k.clicks,
    impressions: k.impressions,
    conversions: k.conversions,
    conversions_value: k.conversionsValue,
    quality_score: k.qualityScore,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('google_ads_keywords')
      .upsert(batch, { 
        onConflict: 'business_id,keyword,match_type,date',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error saving keywords batch:', error);
    }
  }
}

/**
 * Save search terms to database
 */
async function saveSearchTerms(businessId: string, searchTerms: SearchTermMetrics[]): Promise<void> {
  if (searchTerms.length === 0) return;

  const records = searchTerms.map(st => ({
    business_id: businessId,
    search_term: st.searchTerm,
    ad_group_id: st.adGroupId,
    campaign_id: st.campaignId,
    date: st.date,
    cost: st.cost,
    clicks: st.clicks,
    impressions: st.impressions,
    conversions: st.conversions,
    conversions_value: st.conversionsValue,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('google_ads_search_terms')
      .upsert(batch, { 
        onConflict: 'business_id,search_term,date',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error saving search terms batch:', error);
    }
  }
}

/**
 * Get customer ID for a business (auto-detect if not set)
 */
export async function getCustomerId(businessId: string, refreshToken: string): Promise<string | null> {
  // First check if already saved
  const { data } = await supabase
    .from('business_settings')
    .select('google_ads_customer_id')
    .eq('business_id', businessId)
    .single();

  if (data?.google_ads_customer_id) {
    return data.google_ads_customer_id;
  }

  // Auto-detect from accessible customers
  try {
    const customers = await listAccessibleCustomers(refreshToken);
    if (customers.length > 0) {
      // Save the first one
      await supabase
        .from('business_settings')
        .update({ google_ads_customer_id: customers[0] })
        .eq('business_id', businessId);

      return customers[0];
    }
  } catch (err) {
    console.error('Error detecting customer ID:', err);
  }

  return null;
}
