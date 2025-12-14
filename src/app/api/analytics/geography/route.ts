/**
 * Geography Analytics API
 * 
 * נתוני גיאוגרפיה מ-GA4
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getValidCredentials } from '@/lib/google-analytics';

// Use Google Ads OAuth credentials (same as used for GA connection)
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET;

export const dynamic = 'force-dynamic';

// Ensure endDate doesn't exceed today
function getMaxEndDate(endDate: string): string {
  if (endDate === 'today' || endDate === 'yesterday') {
    return endDate;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedEnd = new Date(endDate);
  requestedEnd.setHours(0, 0, 0, 0);
  
  if (requestedEnd > today) {
    return today.toISOString().split('T')[0];
  }
  
  return endDate;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = getMaxEndDate(searchParams.get('endDate') || 'today');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get GA credentials with auto-refresh
    const result = await getValidCredentials(businessId);
    
    if ('error' in result) {
      const status = result.needsAuth ? 401 : 400;
      return NextResponse.json(result, { status });
    }

    const { credentials, propertyId } = result;

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
    });

    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: oauth2Client,
    });

    // Countries data
    const countriesResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
        limit: '20',
      },
    });

    const countries = (countriesResponse.data.rows || []).map(row => {
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      const conversions = parseInt(row.metricValues?.[2]?.value || '0');
      const revenue = parseFloat(row.metricValues?.[3]?.value || '0');
      return {
        country: row.dimensionValues?.[0]?.value || 'לא ידוע',
        users,
        sessions,
        conversions,
        revenue,
        conversionRate: users > 0 ? (conversions / users) * 100 : 0,
      };
    });

    // Cities data
    const citiesResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
        limit: '20',
      },
    });

    const cities = (citiesResponse.data.rows || []).map(row => ({
      city: row.dimensionValues?.[0]?.value || 'לא ידוע',
      country: row.dimensionValues?.[1]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      conversions: parseInt(row.metricValues?.[1]?.value || '0'),
      revenue: parseFloat(row.metricValues?.[2]?.value || '0'),
    })).filter(c => c.city !== '(not set)');

    // Summary
    const totalUsers = countries.reduce((sum, c) => sum + c.users, 0);
    const topCountry = countries[0];

    return NextResponse.json({
      countries,
      cities,
      summary: {
        totalCountries: countries.length,
        topCountry: topCountry?.country || 'N/A',
        topCountryPercent: totalUsers > 0 ? Math.round((topCountry?.users || 0) / totalUsers * 100) : 0,
      },
    });

  } catch (error: any) {
    console.error('Geography API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
