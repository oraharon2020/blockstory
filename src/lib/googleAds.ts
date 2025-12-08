// Google Ads API Client
// Documentation: https://developers.google.com/google-ads/api/docs/start

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

// Create OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/google-ads/callback`
  );
}

// Generate auth URL for user to authorize
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
  });
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get authenticated client with refresh token
export function getAuthenticatedClient(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

// Types for Google Ads data
export interface CampaignData {
  id: string;
  name: string;
  status: string;
  cost: number; // in micros (divide by 1,000,000)
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number; // click-through rate
  cpc: number; // cost per click
  date: string;
}

export interface DailySpend {
  date: string;
  totalCost: number;
  campaigns: CampaignData[];
}

// Fetch campaigns data using Google Ads API
// Note: This requires the google-ads-api package or REST API calls
export async function fetchCampaignsData(
  refreshToken: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<CampaignData[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  
  if (!developerToken || developerToken === 'YOUR_DEVELOPER_TOKEN_HERE') {
    throw new Error('Google Ads Developer Token not configured');
  }

  // Get access token
  const oauth2Client = getAuthenticatedClient(refreshToken);
  const { token } = await oauth2Client.getAccessToken();

  // Remove dashes from customer ID
  const cleanCustomerId = customerId.replace(/-/g, '');

  // Google Ads API query
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date DESC
  `;

  // Make API request
  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Ads API error:', error);
    throw new Error(`Google Ads API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Parse response
  const campaigns: CampaignData[] = [];
  
  for (const batch of data) {
    for (const result of batch.results || []) {
      campaigns.push({
        id: result.campaign.id,
        name: result.campaign.name,
        status: result.campaign.status,
        cost: (result.metrics.costMicros || 0) / 1_000_000,
        clicks: result.metrics.clicks || 0,
        impressions: result.metrics.impressions || 0,
        conversions: result.metrics.conversions || 0,
        ctr: result.metrics.ctr || 0,
        cpc: (result.metrics.averageCpc || 0) / 1_000_000,
        date: result.segments.date,
      });
    }
  }

  return campaigns;
}

// Get daily total spend
export async function getDailySpend(
  refreshToken: string,
  customerId: string,
  date: string
): Promise<number> {
  const campaigns = await fetchCampaignsData(refreshToken, customerId, date, date);
  return campaigns.reduce((sum, c) => sum + c.cost, 0);
}

// Get spend for date range grouped by day
export async function getSpendByDateRange(
  refreshToken: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const campaigns = await fetchCampaignsData(refreshToken, customerId, startDate, endDate);
  
  const spendByDate: Record<string, number> = {};
  
  for (const campaign of campaigns) {
    if (!spendByDate[campaign.date]) {
      spendByDate[campaign.date] = 0;
    }
    spendByDate[campaign.date] += campaign.cost;
  }
  
  return spendByDate;
}
