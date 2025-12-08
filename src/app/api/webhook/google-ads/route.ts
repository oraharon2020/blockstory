import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Webhook to receive Google Ads data from Google Ads Scripts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const { businessId, secretKey, data } = body;
    
    if (!businessId || !secretKey || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, secretKey, data' },
        { status: 400 }
      );
    }

    // Verify secret key matches the one stored for this business
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('google_ads_webhook_secret')
      .eq('business_id', businessId)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (settings.google_ads_webhook_secret !== secretKey) {
      return NextResponse.json(
        { error: 'Invalid secret key' },
        { status: 401 }
      );
    }

    // Process the data - now includes full metrics
    const { 
      date, 
      cost, 
      clicks, 
      impressions, 
      conversions, 
      conversionValue,
      campaigns, 
      adGroups, 
      keywords, 
      searchTerms 
    } = data;

    if (!date || cost === undefined) {
      return NextResponse.json(
        { error: 'Missing date or cost in data' },
        { status: 400 }
      );
    }

    // Update daily_cashflow with Google Ads cost
    const { data: existingRow } = await supabase
      .from('daily_cashflow')
      .select('*')
      .eq('business_id', businessId)
      .eq('date', date)
      .single();

    if (existingRow) {
      // Update existing row
      const { error: updateError } = await supabase
        .from('daily_cashflow')
        .update({
          google_ads_cost: cost,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('date', date);

      if (updateError) {
        console.error('Error updating daily_cashflow:', updateError);
        return NextResponse.json(
          { error: 'Failed to update data' },
          { status: 500 }
        );
      }
    } else {
      // Create new row
      const { error: insertError } = await supabase
        .from('daily_cashflow')
        .insert({
          business_id: businessId,
          date,
          google_ads_cost: cost,
          revenue: 0,
          orders_count: 0,
          facebook_ads_cost: 0,
          tiktok_ads_cost: 0,
          shipping_cost: 0,
          materials_cost: 0,
          credit_card_fees: 0,
          vat: 0,
          total_expenses: cost,
          profit: -cost,
          roi: 0,
        });

      if (insertError) {
        console.error('Error inserting daily_cashflow:', insertError);
        return NextResponse.json(
          { error: 'Failed to insert data' },
          { status: 500 }
        );
      }
    }

    // Save campaign details if provided
    if (campaigns && Array.isArray(campaigns) && campaigns.length > 0) {
      for (const campaign of campaigns) {
        await supabase
          .from('google_ads_campaigns')
          .upsert({
            business_id: businessId,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: campaign.status,
            date,
            cost: campaign.cost || 0,
            clicks: campaign.clicks || 0,
            impressions: campaign.impressions || 0,
            conversions: campaign.conversions || 0,
            conversion_value: campaign.conversionValue || 0,
            ctr: campaign.ctr || 0,
            avg_cpc: campaign.avgCpc || 0,
            cost_per_conversion: campaign.costPerConversion || 0,
            conversion_rate: campaign.conversionRate || 0,
            impression_share: campaign.impressionShare || 0,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id,campaign_id,date'
          });
      }
    }

    // Save ad groups if provided
    if (adGroups && Array.isArray(adGroups) && adGroups.length > 0) {
      for (const adGroup of adGroups) {
        await supabase
          .from('google_ads_ad_groups')
          .upsert({
            business_id: businessId,
            campaign_id: adGroup.campaignId,
            ad_group_id: adGroup.id,
            ad_group_name: adGroup.name,
            status: adGroup.status,
            date,
            cost: adGroup.cost || 0,
            clicks: adGroup.clicks || 0,
            impressions: adGroup.impressions || 0,
            conversions: adGroup.conversions || 0,
            ctr: adGroup.ctr || 0,
            avg_cpc: adGroup.avgCpc || 0,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id,ad_group_id,date'
          });
      }
    }

    // Save keywords if provided
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      for (const kw of keywords) {
        await supabase
          .from('google_ads_keywords')
          .upsert({
            business_id: businessId,
            campaign_id: kw.campaignId,
            ad_group_id: kw.adGroupId,
            keyword: kw.keyword,
            match_type: kw.matchType,
            quality_score: kw.qualityScore || 0,
            date,
            cost: kw.cost || 0,
            clicks: kw.clicks || 0,
            impressions: kw.impressions || 0,
            conversions: kw.conversions || 0,
            ctr: kw.ctr || 0,
            avg_cpc: kw.avgCpc || 0,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id,keyword,match_type,date'
          });
      }
    }

    // Save search terms if provided
    if (searchTerms && Array.isArray(searchTerms) && searchTerms.length > 0) {
      for (const term of searchTerms) {
        await supabase
          .from('google_ads_search_terms')
          .upsert({
            business_id: businessId,
            campaign_id: term.campaignId,
            query: term.query,
            date,
            cost: term.cost || 0,
            clicks: term.clicks || 0,
            impressions: term.impressions || 0,
            conversions: term.conversions || 0,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id,query,date'
          });
      }
    }

    console.log(`✅ Google Ads data updated for ${businessId} on ${date}: ₪${cost}, ${campaigns?.length || 0} campaigns, ${keywords?.length || 0} keywords`);

    return NextResponse.json({
      success: true,
      message: `Updated Google Ads data for ${date}: ₪${cost}`,
      stats: {
        campaigns: campaigns?.length || 0,
        adGroups: adGroups?.length || 0,
        keywords: keywords?.length || 0,
        searchTerms: searchTerms?.length || 0,
      }
    });

  } catch (error) {
    console.error('Google Ads webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Return info about the webhook
export async function GET() {
  return NextResponse.json({
    name: 'Google Ads Webhook',
    description: 'Receives daily spend data from Google Ads Scripts',
    expectedPayload: {
      businessId: 'string (UUID)',
      secretKey: 'string',
      data: {
        date: 'YYYY-MM-DD',
        cost: 'number (total daily spend)',
        campaigns: [
          {
            id: 'campaign ID',
            name: 'campaign name',
            cost: 'number',
            clicks: 'number',
            impressions: 'number',
            conversions: 'number',
          }
        ]
      }
    }
  });
}
