/**
 * Time Analysis API
 * 
 * ניתוח זמנים - שעות וימים מ-GA4
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

    // Hourly data
    const hourlyResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'hour' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ dimension: { dimensionName: 'hour' }, desc: false }],
      },
    });

    // Create full 24 hours array
    const hourlyMap: Record<number, { users: number; conversions: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { users: 0, conversions: 0, revenue: 0 };
    }
    
    (hourlyResponse.data.rows || []).forEach(row => {
      const hour = parseInt(row.dimensionValues?.[0]?.value || '0');
      hourlyMap[hour] = {
        users: parseInt(row.metricValues?.[0]?.value || '0'),
        conversions: parseInt(row.metricValues?.[1]?.value || '0'),
        revenue: parseFloat(row.metricValues?.[2]?.value || '0'),
      };
    });

    const hourly = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));

    // Daily data (day of week)
    const dailyResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'dayOfWeek' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'conversions' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ dimension: { dimensionName: 'dayOfWeek' }, desc: false }],
      },
    });

    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    // Create full 7 days array
    const dailyMap: Record<number, { users: number; conversions: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) {
      dailyMap[i] = { users: 0, conversions: 0, revenue: 0 };
    }

    (dailyResponse.data.rows || []).forEach(row => {
      const dayNum = parseInt(row.dimensionValues?.[0]?.value || '0');
      dailyMap[dayNum] = {
        users: parseInt(row.metricValues?.[0]?.value || '0'),
        conversions: parseInt(row.metricValues?.[1]?.value || '0'),
        revenue: parseFloat(row.metricValues?.[2]?.value || '0'),
      };
    });

    const daily = Object.entries(dailyMap).map(([dayNum, data]) => ({
      dayNum: parseInt(dayNum),
      day: dayNames[parseInt(dayNum)] || '',
      ...data,
    }));

    // Find peaks
    const peakHourData = hourly.reduce((max, h) => h.users > max.users ? h : max, hourly[0]);
    const peakDayData = daily.reduce((max, d) => d.users > max.users ? d : max, daily[0]);
    
    // Find best converting hour
    const bestConvertingHour = hourly
      .filter(h => h.users > 0)
      .reduce((best, h) => {
        const rate = h.conversions / h.users;
        const bestRate = best.users > 0 ? best.conversions / best.users : 0;
        return rate > bestRate ? h : best;
      }, hourly[0]);

    // Generate insights
    const getHourLabel = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
    
    let recommendation = '';
    if (peakHourData.hour >= 9 && peakHourData.hour <= 12) {
      recommendation = 'רוב התנועה שלך בשעות הבוקר. שלח מבצעים ופרסומות לפני 9:00 כדי לתפוס את הגולשים בזמן.';
    } else if (peakHourData.hour >= 18 && peakHourData.hour <= 22) {
      recommendation = 'רוב התנועה שלך בשעות הערב. זה הזמן לפרסם קמפיינים ולשלוח ניוזלטרים!';
    } else if (peakHourData.hour >= 12 && peakHourData.hour <= 14) {
      recommendation = 'שעת הצהריים פופולרית אצלך. אנשים גולשים בהפסקה - נצל את זה לפרסום!';
    } else {
      recommendation = `שעת השיא שלך ${getHourLabel(peakHourData.hour)}. תזמן קמפיינים ופוסטים לשעה זו.`;
    }

    // Add day recommendation
    if (peakDayData.dayNum === 5 || peakDayData.dayNum === 6) {
      recommendation += ' סוף השבוע פעיל במיוחד - הגדל תקציב פרסום לימים אלה.';
    }

    return NextResponse.json({
      hourly,
      daily,
      peakHour: {
        hour: peakHourData.hour,
        label: getHourLabel(peakHourData.hour),
      },
      peakDay: {
        day: peakDayData.day,
        dayNum: peakDayData.dayNum,
      },
      insights: {
        bestTimeToPost: getHourLabel(bestConvertingHour.hour),
        worstTime: getHourLabel(hourly.reduce((min, h) => h.users < min.users ? h : min, hourly[0]).hour),
        recommendation,
      },
    });

  } catch (error: any) {
    console.error('Time Analysis API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
