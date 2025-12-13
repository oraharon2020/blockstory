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
  GACredentials 
} from '@/lib/google-analytics/client';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = searchParams.get('endDate') || 'today';
    const report = searchParams.get('report') || 'overview'; // overview, campaigns, daily

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get GA credentials for this business
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('credentials, settings')
      .eq('business_id', businessId)
      .eq('type', 'google_analytics')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ 
        error: 'Google Analytics not connected',
        needsAuth: true 
      }, { status: 401 });
    }

    // Check if property is selected
    if (!integration.settings?.property_id) {
      return NextResponse.json({ 
        error: 'No GA4 property selected',
        needsPropertySelection: true 
      }, { status: 400 });
    }

    const credentials: GACredentials = {
      access_token: integration.credentials.access_token,
      refresh_token: integration.credentials.refresh_token,
      property_id: integration.settings.property_id,
    };

    const dateRange = { startDate, endDate };

    switch (report) {
      case 'overview': {
        const gaData = await getTrafficBySource(credentials, dateRange);
        
        // Get ad spend from daily_cashflow for the same period
        const { data: cashflowData } = await supabase
          .from('daily_cashflow')
          .select('google_ads_cost, facebook_ads_cost, tiktok_ads_cost')
          .eq('business_id', businessId)
          .gte('date', startDate === '30daysAgo' ? new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0] : startDate)
          .lte('date', endDate === 'today' ? new Date().toISOString().split('T')[0] : endDate);
        
        const adSpend = {
          google: cashflowData?.reduce((sum, d) => sum + (d.google_ads_cost || 0), 0) || 0,
          facebook: cashflowData?.reduce((sum, d) => sum + (d.facebook_ads_cost || 0), 0) || 0,
          tiktok: cashflowData?.reduce((sum, d) => sum + (d.tiktok_ads_cost || 0), 0) || 0,
        };
        
        const channelMetrics = calculateChannelMetrics(gaData, adSpend);
        
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
