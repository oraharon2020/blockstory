/**
 * Google Analytics 4 Data API Client
 * 
 * מודול לשליפת נתונים מ-Google Analytics 4
 * משתמש ב-OAuth2 credentials קיימים
 */

import { google, analyticsdata_v1beta } from 'googleapis';

export interface GACredentials {
  access_token: string;
  refresh_token?: string;
  property_id?: string; // GA4 Property ID
}

export interface GADateRange {
  startDate: string; // YYYY-MM-DD or 'today', '7daysAgo', '30daysAgo'
  endDate: string;
}

export interface GAConversionsBySource {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

export interface GATrafficOverview {
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  totalConversions: number;
  totalRevenue: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface GASourceBreakdown {
  sources: GAConversionsBySource[];
  overview: GATrafficOverview;
}

/**
 * יצירת OAuth2 client עם credentials
 */
function createOAuth2Client(credentials: GACredentials) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
  });
  
  return oauth2Client;
}

/**
 * שליפת נתוני תנועה לפי מקור
 */
export async function getTrafficBySource(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<GASourceBreakdown> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });
  
  try {
    // שליפת נתונים לפי מקור/מדיום
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{
          metric: { metricName: 'sessions' },
          desc: true,
        }],
        limit: '20',
      },
    });
    
    // שליפת סיכום כללי
    const overviewResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      },
    });
    
    // עיבוד נתוני מקורות
    const sources: GAConversionsBySource[] = [];
    const rows = response.data.rows || [];
    
    for (const row of rows) {
      const source = row.dimensionValues?.[0]?.value || '(direct)';
      const medium = row.dimensionValues?.[1]?.value || '(none)';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      const conversions = parseInt(row.metricValues?.[1]?.value || '0');
      const revenue = parseFloat(row.metricValues?.[2]?.value || '0');
      
      sources.push({
        source,
        medium,
        sessions,
        conversions,
        revenue,
      });
    }
    
    // עיבוד סיכום
    const overviewRow = overviewResponse.data.rows?.[0];
    const overview: GATrafficOverview = {
      totalSessions: parseInt(overviewRow?.metricValues?.[0]?.value || '0'),
      totalUsers: parseInt(overviewRow?.metricValues?.[1]?.value || '0'),
      totalPageviews: parseInt(overviewRow?.metricValues?.[2]?.value || '0'),
      totalConversions: parseInt(overviewRow?.metricValues?.[3]?.value || '0'),
      totalRevenue: parseFloat(overviewRow?.metricValues?.[4]?.value || '0'),
      bounceRate: parseFloat(overviewRow?.metricValues?.[5]?.value || '0'),
      avgSessionDuration: parseFloat(overviewRow?.metricValues?.[6]?.value || '0'),
    };
    
    return { sources, overview };
    
  } catch (error: any) {
    console.error('GA4 API Error:', error.message);
    throw new Error(`Failed to fetch GA4 data: ${error.message}`);
  }
}

/**
 * שליפת נתוני המרות לפי קמפיין
 */
export async function getConversionsByCampaign(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<{ campaigns: Array<{ campaign: string; source: string; conversions: number; revenue: number; cost: number }> }> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });
  
  try {
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }],
        dimensions: [
          { name: 'sessionCampaignName' },
          { name: 'sessionSource' },
        ],
        metrics: [
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionCampaignName',
            stringFilter: {
              matchType: 'FULL_REGEXP',
              value: '.+', // Not empty
            },
          },
        },
        orderBys: [{
          metric: { metricName: 'conversions' },
          desc: true,
        }],
        limit: '50',
      },
    });
    
    const campaigns = (response.data.rows || []).map((row: analyticsdata_v1beta.Schema$Row) => ({
      campaign: row.dimensionValues?.[0]?.value || '(not set)',
      source: row.dimensionValues?.[1]?.value || '(direct)',
      conversions: parseInt(row.metricValues?.[0]?.value || '0'),
      revenue: parseFloat(row.metricValues?.[1]?.value || '0'),
      cost: 0, // יתווסף מ-Google Ads API
    }));
    
    return { campaigns };
    
  } catch (error: any) {
    console.error('GA4 Campaign API Error:', error.message);
    throw new Error(`Failed to fetch campaign data: ${error.message}`);
  }
}

/**
 * שליפת נתונים יומיים
 */
export async function getDailyMetrics(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<{ daily: Array<{ date: string; sessions: number; conversions: number; revenue: number }> }> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });
  
  try {
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }],
        dimensions: [
          { name: 'date' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{
          dimension: { dimensionName: 'date' },
          desc: false,
        }],
      },
    });
    
    const daily = (response.data.rows || []).map(row => {
      const dateStr = row.dimensionValues?.[0]?.value || '';
      // Convert YYYYMMDD to YYYY-MM-DD
      const formattedDate = dateStr.length === 8 
        ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
        : dateStr;
      
      return {
        date: formattedDate,
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        conversions: parseInt(row.metricValues?.[1]?.value || '0'),
        revenue: parseFloat(row.metricValues?.[2]?.value || '0'),
      };
    });
    
    return { daily };
    
  } catch (error: any) {
    console.error('GA4 Daily API Error:', error.message);
    throw new Error(`Failed to fetch daily data: ${error.message}`);
  }
}

/**
 * חישוב ROAS ו-CPA לפי מקור
 * משלב נתונים מ-GA4 עם הוצאות פרסום
 */
export function calculateChannelMetrics(
  gaData: GASourceBreakdown,
  adSpend: { google: number; facebook: number; tiktok: number }
): Array<{
  channel: string;
  sessions: number;
  conversions: number;
  revenue: number;
  spend: number;
  cpa: number;
  roas: number;
}> {
  const channelMap: Record<string, { sessions: number; conversions: number; revenue: number }> = {
    google: { sessions: 0, conversions: 0, revenue: 0 },
    facebook: { sessions: 0, conversions: 0, revenue: 0 },
    tiktok: { sessions: 0, conversions: 0, revenue: 0 },
    organic: { sessions: 0, conversions: 0, revenue: 0 },
    direct: { sessions: 0, conversions: 0, revenue: 0 },
    other: { sessions: 0, conversions: 0, revenue: 0 },
  };
  
  for (const src of gaData.sources) {
    const sourceLower = src.source.toLowerCase();
    const mediumLower = src.medium.toLowerCase();
    
    let channel = 'other';
    
    if (sourceLower.includes('google') || mediumLower === 'cpc' && sourceLower === 'google') {
      channel = 'google';
    } else if (sourceLower.includes('facebook') || sourceLower.includes('fb') || sourceLower.includes('instagram') || sourceLower.includes('ig')) {
      channel = 'facebook';
    } else if (sourceLower.includes('tiktok')) {
      channel = 'tiktok';
    } else if (mediumLower === 'organic' || sourceLower === 'google' && mediumLower === 'organic') {
      channel = 'organic';
    } else if (sourceLower === '(direct)' || sourceLower === 'direct') {
      channel = 'direct';
    }
    
    channelMap[channel].sessions += src.sessions;
    channelMap[channel].conversions += src.conversions;
    channelMap[channel].revenue += src.revenue;
  }
  
  const spendMap: Record<string, number> = {
    google: adSpend.google,
    facebook: adSpend.facebook,
    tiktok: adSpend.tiktok,
    organic: 0,
    direct: 0,
    other: 0,
  };
  
  return Object.entries(channelMap)
    .filter(([_, data]) => data.sessions > 0 || spendMap[_] > 0)
    .map(([channel, data]) => {
      const spend = spendMap[channel] || 0;
      return {
        channel,
        sessions: data.sessions,
        conversions: data.conversions,
        revenue: data.revenue,
        spend,
        cpa: data.conversions > 0 ? spend / data.conversions : 0,
        roas: spend > 0 ? data.revenue / spend : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
