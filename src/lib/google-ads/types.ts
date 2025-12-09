/**
 * Google Ads Data Types
 * טיפוסי נתונים לעבודה עם Google Ads API
 */

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  channelType: string;
  biddingStrategy: string;
}

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number; // In actual currency (not micros)
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  channelType: string;
}

// Ad Group types
export interface AdGroup {
  id: string;
  name: string;
  status: string;
  type: string;
  campaignId: string;
  campaignName: string;
}

export interface AdGroupMetrics {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

// Ad types
export interface Ad {
  id: string;
  type: string;
  finalUrls: string[];
  headlines: string[];
  descriptions: string[];
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
}

export interface AdMetrics {
  adId: string;
  adGroupId: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

// Keyword types
export interface Keyword {
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  status: string;
  qualityScore?: number;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
}

export interface KeywordMetrics {
  keyword: string;
  matchType: string;
  adGroupId: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  qualityScore?: number;
}

// Search Term types
export interface SearchTerm {
  searchTerm: string;
  status: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
}

export interface SearchTermMetrics {
  searchTerm: string;
  adGroupId: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

// Account Summary
export interface AccountSummary {
  customerId: string;
  accountName: string;
  currency: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

// Full sync result
export interface GoogleAdsSyncResult {
  success: boolean;
  syncedAt: string;
  campaigns: number;
  adGroups: number;
  ads: number;
  keywords: number;
  searchTerms: number;
  errors?: string[];
}
