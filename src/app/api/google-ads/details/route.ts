import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleAdsApi } from 'google-ads-api';

export const dynamic = 'force-dynamic';

// Google Ads API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '365551544962-hi7tqlt88mgmdlpact7jgu6v27tmok5k.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'XpnDkpbdkgWtNJmZ-F9hng';

// Helper to refresh access token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return data.access_token;
}

// GET - Fetch detailed Google Ads data via API
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');
  const dataType = searchParams.get('type') || 'ads'; // ads, assets, audiences

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  try {
    // Get business settings with refresh token
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('google_ads_refresh_token, google_ads_customer_id')
      .eq('business_id', businessId)
      .single();

    if (settingsError || !settings?.google_ads_refresh_token) {
      return NextResponse.json({ 
        error: 'Google Ads not connected',
        needsAuth: true 
      }, { status: 401 });
    }

    // Get fresh access token
    const accessToken = await refreshAccessToken(settings.google_ads_refresh_token);

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      developer_token: DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: settings.google_ads_customer_id,
      refresh_token: settings.google_ads_refresh_token,
    });

    let result: any = {};

    if (dataType === 'ads' || dataType === 'all') {
      // Fetch ad texts and details
      const ads = await customer.query(`
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.status,
          ad_group.name,
          campaign.name,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM ad_group_ad
        WHERE segments.date DURING LAST_30_DAYS
        AND ad_group_ad.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
      `);

      result.ads = ads.map((row: any) => ({
        id: row.ad_group_ad?.ad?.id,
        name: row.ad_group_ad?.ad?.name,
        type: row.ad_group_ad?.ad?.type,
        headlines: row.ad_group_ad?.ad?.responsive_search_ad?.headlines?.map((h: any) => h.text) || [],
        descriptions: row.ad_group_ad?.ad?.responsive_search_ad?.descriptions?.map((d: any) => d.text) || [],
        finalUrls: row.ad_group_ad?.ad?.final_urls || [],
        status: row.ad_group_ad?.status,
        adGroupName: row.ad_group?.name,
        campaignName: row.campaign?.name,
        campaignType: row.campaign?.advertising_channel_type,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        cost: (row.metrics?.cost_micros || 0) / 1000000,
        conversions: row.metrics?.conversions || 0,
      }));
    }

    if (dataType === 'assets' || dataType === 'all') {
      // Fetch assets (images, videos, etc.)
      const assets = await customer.query(`
        SELECT
          asset.id,
          asset.name,
          asset.type,
          asset.image_asset.file_size,
          asset.image_asset.full_size.url,
          asset.youtube_video_asset.youtube_video_id,
          asset.text_asset.text
        FROM asset
        WHERE asset.type IN ('IMAGE', 'YOUTUBE_VIDEO', 'TEXT')
        LIMIT 100
      `);

      result.assets = assets.map((row: any) => ({
        id: row.asset?.id,
        name: row.asset?.name,
        type: row.asset?.type,
        imageUrl: row.asset?.image_asset?.full_size?.url,
        youtubeVideoId: row.asset?.youtube_video_asset?.youtube_video_id,
        text: row.asset?.text_asset?.text,
      }));
    }

    if (dataType === 'audiences' || dataType === 'all') {
      // Fetch audience targeting info
      const audiences = await customer.query(`
        SELECT
          campaign.name,
          campaign_criterion.criterion_id,
          campaign_criterion.type,
          campaign_criterion.user_list.user_list,
          campaign_criterion.age_range.type,
          campaign_criterion.gender.type,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM campaign_criterion
        WHERE segments.date DURING LAST_30_DAYS
        AND campaign_criterion.status = 'ENABLED'
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `);

      result.audiences = audiences.map((row: any) => ({
        campaignName: row.campaign?.name,
        criterionId: row.campaign_criterion?.criterion_id,
        type: row.campaign_criterion?.type,
        userList: row.campaign_criterion?.user_list?.user_list,
        ageRange: row.campaign_criterion?.age_range?.type,
        gender: row.campaign_criterion?.gender?.type,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        conversions: row.metrics?.conversions || 0,
      }));
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Google Ads API error:', error);
    
    // Check if token is invalid
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired')) {
      // Clear the invalid token
      await supabase
        .from('business_settings')
        .update({
          google_ads_refresh_token: null,
          google_ads_connected: false,
        })
        .eq('business_id', businessId);

      return NextResponse.json({ 
        error: 'Google Ads connection expired. Please reconnect.',
        needsAuth: true 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Google Ads data' 
    }, { status: 500 });
  }
}
