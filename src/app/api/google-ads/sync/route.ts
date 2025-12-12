/**
 * Google Ads Sync API
 * API לסנכרון נתונים מ-Google Ads
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncGoogleAdsData, getCustomerId } from '@/lib/google-ads';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for sync

// POST - Trigger sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, startDate, endDate, syncTypes } = body;
    
    console.log('🔄 Google Ads Sync Request:', { businessId, startDate, endDate, syncTypes });

    if (!businessId) {
      console.log('❌ Missing businessId');
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    // Get business settings with refresh token
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('google_ads_refresh_token, google_ads_customer_id')
      .eq('business_id', businessId)
      .single();
    
    console.log('📋 Settings:', { 
      hasRefreshToken: !!settings?.google_ads_refresh_token,
      customerId: settings?.google_ads_customer_id,
      settingsError: settingsError?.message 
    });

    if (settingsError || !settings?.google_ads_refresh_token) {
      console.log('❌ Google Ads not connected');
      return NextResponse.json(
        { error: 'Google Ads not connected. Please connect first in Settings.' },
        { status: 400 }
      );
    }

    // Get or detect customer ID
    let customerId = settings.google_ads_customer_id;
    if (!customerId) {
      console.log('🔍 Trying to detect customer ID...');
      customerId = await getCustomerId(businessId, settings.google_ads_refresh_token);
      if (!customerId) {
        console.log('❌ No Google Ads account found');
        return NextResponse.json(
          { error: 'No Google Ads account found. Please check your account.' },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ Using customer ID:', customerId);

    // Calculate date range (default: last 90 days)
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Run sync
    const result = await syncGoogleAdsData({
      businessId,
      refreshToken: settings.google_ads_refresh_token,
      customerId,
      startDate: start,
      endDate: end,
      syncCampaigns: syncTypes?.campaigns !== false,
      syncAdGroups: syncTypes?.adGroups !== false,
      syncAds: syncTypes?.ads !== false,
      syncKeywords: syncTypes?.keywords !== false,
      syncSearchTerms: syncTypes?.searchTerms !== false,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Get sync status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  try {
    const { data: settings } = await supabase
      .from('business_settings')
      .select('google_ads_refresh_token, google_ads_customer_id, google_ads_last_sync')
      .eq('business_id', businessId)
      .single();

    const isConnected = !!settings?.google_ads_refresh_token;
    
    // Get counts from tables
    const [campaignsCount, keywordsCount, searchTermsCount, adsCount] = await Promise.all([
      supabase.from('google_ads_campaigns').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('google_ads_keywords').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('google_ads_search_terms').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('google_ads_ads').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    ]);

    return NextResponse.json({
      isConnected,
      customerId: settings?.google_ads_customer_id,
      lastSync: settings?.google_ads_last_sync,
      counts: {
        campaigns: campaignsCount.count || 0,
        keywords: keywordsCount.count || 0,
        searchTerms: searchTermsCount.count || 0,
        ads: adsCount.count || 0,
      },
    });

  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
