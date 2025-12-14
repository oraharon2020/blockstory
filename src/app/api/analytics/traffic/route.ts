/**
 * Traffic Analytics API
 * 
 * נתוני תנועה מ-GA4: משתמשים, מכשירים, דפים נצפים
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrafficAnalytics, getValidCredentials } from '@/lib/google-analytics';

export const dynamic = 'force-dynamic';

// Ensure endDate doesn't exceed today (GA4 can't process future dates for currency exchange)
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

    const { credentials } = result;

    const data = await getTrafficAnalytics(credentials, { startDate, endDate });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Traffic API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
