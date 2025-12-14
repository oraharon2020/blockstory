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

// Use Google Ads OAuth credentials (same as analytics callback)
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

/**
 * רענון access_token באמצעות refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date?: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to refresh GA token:', error);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens = await response.json();
  return {
    access_token: tokens.access_token,
    expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
  };
}

/**
 * יצירת OAuth2 client עם credentials
 */
function createOAuth2Client(credentials: GACredentials) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET
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

// ===========================================
// פונקציות חדשות לטאבים של דף הסטטיסטיקות
// ===========================================

/**
 * נתוני תנועה - משתמשים חדשים/חוזרים, מכשירים
 */
export async function getTrafficAnalytics(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<{
  userTypes: { type: string; users: number; sessions: number }[];
  devices: { device: string; users: number; sessions: number; percentage: number }[];
  topPages: { page: string; views: number; avgTime: number }[];
  avgSessionDuration: number;
  bounceRate: number;
}> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });

  try {
    // משתמשים חדשים vs חוזרים
    const userTypesResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      },
    });

    const userTypesRaw = (userTypesResponse.data.rows || []).map(row => ({
      type: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
    }));

    // Aggregate user types - combine "returning" and "(not set)" into "returning"
    const userTypesMap: Record<string, { users: number; sessions: number }> = {
      'חדשים': { users: 0, sessions: 0 },
      'חוזרים': { users: 0, sessions: 0 },
    };
    
    userTypesRaw.forEach(item => {
      if (item.type === 'new') {
        userTypesMap['חדשים'].users += item.users;
        userTypesMap['חדשים'].sessions += item.sessions;
      } else {
        // "returning" or "(not set)" -> חוזרים
        userTypesMap['חוזרים'].users += item.users;
        userTypesMap['חוזרים'].sessions += item.sessions;
      }
    });

    const userTypes = Object.entries(userTypesMap)
      .filter(([_, data]) => data.users > 0)
      .map(([type, data]) => ({ type, ...data }));

    // התפלגות מכשירים
    const devicesResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      },
    });

    const totalDeviceUsers = (devicesResponse.data.rows || []).reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'), 0
    );

    // Aggregate devices - handle all device categories properly
    const devicesMap: Record<string, { users: number; sessions: number }> = {
      'נייד': { users: 0, sessions: 0 },
      'מחשב': { users: 0, sessions: 0 },
      'טאבלט': { users: 0, sessions: 0 },
    };

    (devicesResponse.data.rows || []).forEach(row => {
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      const deviceName = (row.dimensionValues?.[0]?.value || '').toLowerCase();
      
      if (deviceName === 'desktop') {
        devicesMap['מחשב'].users += users;
        devicesMap['מחשב'].sessions += sessions;
      } else if (deviceName === 'mobile') {
        devicesMap['נייד'].users += users;
        devicesMap['נייד'].sessions += sessions;
      } else if (deviceName === 'tablet') {
        devicesMap['טאבלט'].users += users;
        devicesMap['טאבלט'].sessions += sessions;
      }
      // Ignore "(not set)" and other unknown categories
    });

    const devices = Object.entries(devicesMap)
      .filter(([_, data]) => data.users > 0)
      .map(([device, data]) => ({
        device,
        users: data.users,
        sessions: data.sessions,
        percentage: totalDeviceUsers > 0 ? Math.round((data.users / totalDeviceUsers) * 100) : 0,
      }))
      .sort((a, b) => b.users - a.users); // Sort by users descending

    // דפים הכי נצפים
    const pagesResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: '10',
      },
    });

    const topPages = (pagesResponse.data.rows || []).map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
      avgTime: parseFloat(row.metricValues?.[1]?.value || '0'),
    }));

    // סיכום כללי
    const overviewResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics: [{ name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      },
    });

    const overview = overviewResponse.data.rows?.[0];

    return {
      userTypes,
      devices,
      topPages,
      avgSessionDuration: parseFloat(overview?.metricValues?.[0]?.value || '0'),
      bounceRate: parseFloat(overview?.metricValues?.[1]?.value || '0') * 100,
    };
  } catch (error: any) {
    console.error('GA4 Traffic Analytics Error:', error.message);
    throw new Error(`Failed to fetch traffic analytics: ${error.message}`);
  }
}

/**
 * נתוני מכירות - Funnel, נטישת עגלה
 */
export async function getSalesAnalytics(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<{
  funnel: { step: string; users: number; dropoff: number }[];
  cartAbandonment: number;
  avgOrderValue: number;
  conversionRate: number;
  purchasesBySource: { source: string; purchases: number; revenue: number }[];
}> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });

  try {
    // נתוני Funnel - אירועי E-commerce
    // משתמשים ב-eventCount במקום totalUsers כי totalUsers סופר משתמשים ייחודיים
    // ו-eventCount סופר את מספר האירועים בפועל (יותר מדויק לרכישות)
    const funnelResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [
          { name: 'eventCount' }, 
          { name: 'totalUsers' },
          { name: 'conversions' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['view_item', 'add_to_cart', 'begin_checkout', 'purchase'],
            },
          },
        },
      },
    });

    // לוג לדיבוג - מראה eventCount, totalUsers, conversions לכל אירוע
    console.log('🔍 GA4 Funnel raw data for', dateRange.startDate, '-', dateRange.endDate);
    (funnelResponse.data.rows || []).forEach(row => {
      console.log(`   ${row.dimensionValues?.[0]?.value}: eventCount=${row.metricValues?.[0]?.value}, users=${row.metricValues?.[1]?.value}, conversions=${row.metricValues?.[2]?.value}`);
    });
    
    // אם אין purchase, נבדוק גם את האירוע transaction_id או transactions
    const purchaseRow = funnelResponse.data.rows?.find(r => r.dimensionValues?.[0]?.value === 'purchase');
    if (!purchaseRow) {
      console.log('⚠️ No purchase events found in this date range!');
    } else {
      console.log('✅ Purchase found: eventCount=' + purchaseRow.metricValues?.[0]?.value);
    }

    const funnelEvents: Record<string, { eventCount: number; users: number }> = {};
    (funnelResponse.data.rows || []).forEach(row => {
      const eventName = row.dimensionValues?.[0]?.value || '';
      funnelEvents[eventName] = {
        eventCount: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
      };
    });

    const funnelSteps = [
      { key: 'view_item', label: 'צפייה במוצר' },
      { key: 'add_to_cart', label: 'הוספה לעגלה' },
      { key: 'begin_checkout', label: 'התחלת תשלום' },
      { key: 'purchase', label: 'רכישה' },
    ];

    // עבור ה-Funnel משתמשים ב-users (ייחודיים) לצפייה/עגלה/checkout
    // אבל עבור purchase משתמשים ב-eventCount (מספר הזמנות בפועל)
    const funnel = funnelSteps.map((step, idx) => {
      // לרכישות - משתמשים ב-eventCount (מספר הזמנות אמיתי)
      // לשאר - משתמשים ב-users (משתמשים ייחודיים)
      const users = step.key === 'purchase' 
        ? (funnelEvents[step.key]?.eventCount || 0)
        : (funnelEvents[step.key]?.users || 0);
      
      const prevUsers = idx > 0 
        ? (funnelSteps[idx - 1].key === 'purchase' 
            ? (funnelEvents[funnelSteps[idx - 1].key]?.eventCount || 0)
            : (funnelEvents[funnelSteps[idx - 1].key]?.users || 0))
        : users;
      
      const dropoff = prevUsers > 0 ? Math.round(((prevUsers - users) / prevUsers) * 100) : 0;
      return { step: step.label, users, dropoff: idx === 0 ? 0 : dropoff };
    });

    // חישוב נטישת עגלה - משתמשים ב-users לעגלה וב-eventCount לרכישות
    const addToCart = funnelEvents['add_to_cart']?.users || 0;
    const purchases = funnelEvents['purchase']?.eventCount || 0;
    const cartAbandonment = addToCart > 0 ? Math.round(((addToCart - purchases) / addToCart) * 100) : 0;

    // נתוני המרות כלליים - משתמשים ב-ecommercePurchases וב-transactions
    const conversionResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
          { name: 'transactions' },
        ],
      },
    });

    const convData = conversionResponse.data.rows?.[0];
    const totalUsers = parseInt(convData?.metricValues?.[0]?.value || '0');
    const ecommercePurchases = parseInt(convData?.metricValues?.[1]?.value || '0');
    const totalRevenue = parseFloat(convData?.metricValues?.[2]?.value || '0');
    const transactions = parseInt(convData?.metricValues?.[3]?.value || '0');
    
    // משתמשים ב-transactions או ecommercePurchases - הגבוה מביניהם
    // כי לפעמים GA4 מדווח רק אחד מהם
    const totalPurchases = Math.max(ecommercePurchases, transactions);
    
    console.log('🔍 GA4 Conversions:', { totalUsers, ecommercePurchases, transactions, totalRevenue });

    const conversionRate = totalUsers > 0 ? (totalPurchases / totalUsers) * 100 : 0;
    const avgOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

    // רכישות לפי מקור
    const sourceResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'ecommercePurchases' }, { name: 'purchaseRevenue' }],
        orderBys: [{ metric: { metricName: 'purchaseRevenue' }, desc: true }],
        limit: '10',
      },
    });

    const purchasesBySource = (sourceResponse.data.rows || []).map(row => ({
      source: row.dimensionValues?.[0]?.value || 'לא ידוע',
      purchases: parseInt(row.metricValues?.[0]?.value || '0'),
      revenue: parseFloat(row.metricValues?.[1]?.value || '0'),
    }));

    return {
      funnel,
      cartAbandonment,
      avgOrderValue,
      conversionRate,
      purchasesBySource,
    };
  } catch (error: any) {
    console.error('GA4 Sales Analytics Error:', error.message);
    throw new Error(`Failed to fetch sales analytics: ${error.message}`);
  }
}

/**
 * נתוני מוצרים - הכי נצפים והכי נמכרים
 */
export async function getProductsAnalytics(
  credentials: GACredentials,
  dateRange: GADateRange
): Promise<{
  topViewed: { name: string; views: number; addToCartRate: number }[];
  topSelling: { name: string; quantity: number; revenue: number }[];
  lowConversion: { name: string; views: number; purchases: number; conversionRate: number }[];
}> {
  const auth = createOAuth2Client(credentials);
  const propertyId = credentials.property_id || process.env.GA4_PROPERTY_ID || '255583525';
  
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
  });

  try {
    // מוצרים הכי נצפים
    const viewedResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemsViewed' }, { name: 'itemsAddedToCart' }],
        orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
        limit: '500',
      },
    });

    const topViewed = (viewedResponse.data.rows || []).map(row => {
      const views = parseInt(row.metricValues?.[0]?.value || '0');
      const addToCart = parseInt(row.metricValues?.[1]?.value || '0');
      return {
        name: row.dimensionValues?.[0]?.value || 'לא ידוע',
        views,
        addToCartRate: views > 0 ? Math.round((addToCart / views) * 100) : 0,
      };
    });

    // מוצרים הכי נמכרים
    const sellingResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemsPurchased' }, { name: 'itemRevenue' }],
        orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
        limit: '500',
      },
    });

    const topSelling = (sellingResponse.data.rows || []).map(row => ({
      name: row.dimensionValues?.[0]?.value || 'לא ידוע',
      quantity: parseInt(row.metricValues?.[0]?.value || '0'),
      revenue: parseFloat(row.metricValues?.[1]?.value || '0'),
    }));

    // מוצרים עם שיעור המרה נמוך (הרבה צפיות, מעט רכישות)
    const conversionResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemsViewed' }, { name: 'itemsPurchased' }],
        orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
        limit: '500',
      },
    });

    const lowConversion = (conversionResponse.data.rows || [])
      .map(row => {
        const views = parseInt(row.metricValues?.[0]?.value || '0');
        const purchases = parseInt(row.metricValues?.[1]?.value || '0');
        return {
          name: row.dimensionValues?.[0]?.value || 'לא ידוע',
          views,
          purchases,
          conversionRate: views > 0 ? (purchases / views) * 100 : 0,
        };
      })
      .filter(p => p.views >= 10 && p.conversionRate < 5) // רק מוצרים עם מספיק צפיות והמרה נמוכה
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 50);

    return {
      topViewed,
      topSelling,
      lowConversion,
    };
  } catch (error: any) {
    console.error('GA4 Products Analytics Error:', error.message);
    throw new Error(`Failed to fetch products analytics: ${error.message}`);
  }
}
