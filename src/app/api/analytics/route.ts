/**
 * Google Analytics API Route
 * 
 * API endpoint לשליפת נתונים מ-GA4
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrafficBySource, 
  getConversionsByCampaign,
  getDailyMetrics,
  calculateChannelMetrics,
} from '@/lib/google-analytics/client';
import { getValidCredentials } from '@/lib/google-analytics';
import { supabase } from '@/lib/supabase';

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
    const report = searchParams.get('report') || 'overview'; // overview, campaigns, daily

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

    const dateRange = { startDate, endDate };

    switch (report) {
      case 'overview': {
        const gaData = await getTrafficBySource(credentials, dateRange);
        
        console.log('GA Data sources:', gaData.sources?.length || 0, 'sources');
        
        // Get ad spend from daily_cashflow for the same period
        const { data: cashflowData, error: cashflowError } = await supabase
          .from('daily_cashflow')
          .select('google_ads_cost, facebook_ads_cost, tiktok_ads_cost')
          .eq('business_id', businessId)
          .gte('date', startDate === '30daysAgo' ? new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0] : startDate)
          .lte('date', endDate === 'today' ? new Date().toISOString().split('T')[0] : endDate);
        
        if (cashflowError) {
          console.log('Cashflow error:', cashflowError);
        }
        console.log('Cashflow data rows:', cashflowData?.length || 0);
        
        const adSpend = {
          google: cashflowData?.reduce((sum, d) => sum + (d.google_ads_cost || 0), 0) || 0,
          facebook: cashflowData?.reduce((sum, d) => sum + (d.facebook_ads_cost || 0), 0) || 0,
          tiktok: cashflowData?.reduce((sum, d) => sum + (d.tiktok_ads_cost || 0), 0) || 0,
        };
        
        console.log('Ad spend:', adSpend);
        
        const channelMetrics = calculateChannelMetrics(gaData, adSpend);
        
        console.log('Channel metrics:', channelMetrics.length, 'channels');
        
        return NextResponse.json({
          overview: gaData.overview,
          sources: gaData.sources,
          channels: channelMetrics,
          adSpend,
        });
      }
      
      case 'campaigns': {
        const campaignData = await getConversionsByCampaign(credentials, dateRange);
        return NextResponse.json(campaignData);
      }
      
      case 'daily': {
        const dailyData = await getDailyMetrics(credentials, dateRange);
        return NextResponse.json(dailyData);
      }
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('GA4 API Error:', error);
    
    // Check if it's an auth error
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json({ 
        error: 'Google Analytics token expired',
        needsAuth: true 
      }, { status: 401 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
