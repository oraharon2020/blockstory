/**
 * Google Ads Module - Main Export
 * נקודת כניסה מרכזית למודול Google Ads
 */

// Client
export { getAccessToken, googleAdsRequest, listAccessibleCustomers } from './client';

// Queries
export {
  getCampaignsQuery,
  getAdGroupsQuery,
  getAdsQuery,
  getKeywordsQuery,
  getSearchTermsQuery,
  getAudiencesQuery,
  getAccountSummaryQuery,
} from './queries';

// Types
export type {
  Campaign,
  CampaignMetrics,
  AdGroup,
  AdGroupMetrics,
  Ad,
  AdMetrics,
  Keyword,
  KeywordMetrics,
  SearchTerm,
  SearchTermMetrics,
  AccountSummary,
  GoogleAdsSyncResult,
} from './types';

// Transformers
export {
  microsToMoney,
  parseCampaignsResponse,
  parseAdGroupsResponse,
  parseAdsResponse,
  parseKeywordsResponse,
  parseSearchTermsResponse,
  parseAccountSummaryResponse,
  aggregateMetrics,
} from './transformers';

// Sync Service
export { syncGoogleAdsData, getCustomerId } from './sync';
