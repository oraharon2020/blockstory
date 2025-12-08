import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = cookies();
    const supabaseClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business ID
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!businessSettings) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessId = businessSettings.business_id;

    // Parse date range from query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Fetch campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('google_ads_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
    }

    // Fetch keywords
    const { data: keywords, error: keywordsError } = await supabase
      .from('google_ads_keywords')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('cost', { ascending: false })
      .limit(500);

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
    }

    // Fetch search terms
    const { data: searchTerms, error: searchTermsError } = await supabase
      .from('google_ads_search_terms')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('cost', { ascending: false })
      .limit(500);

    if (searchTermsError) {
      console.error('Error fetching search terms:', searchTermsError);
    }

    // Aggregate daily summary from campaigns
    const dailySummaryMap: Record<string, {
      date: string;
      cost: number;
      clicks: number;
      impressions: number;
      conversions: number;
      conversionValue: number;
    }> = {};

    (campaigns || []).forEach(campaign => {
      if (!dailySummaryMap[campaign.date]) {
        dailySummaryMap[campaign.date] = {
          date: campaign.date,
          cost: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
        };
      }
      dailySummaryMap[campaign.date].cost += campaign.cost || 0;
      dailySummaryMap[campaign.date].clicks += campaign.clicks || 0;
      dailySummaryMap[campaign.date].impressions += campaign.impressions || 0;
      dailySummaryMap[campaign.date].conversions += campaign.conversions || 0;
      dailySummaryMap[campaign.date].conversionValue += campaign.conversion_value || 0;
    });

    const dailySummary = Object.values(dailySummaryMap).sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate keywords by keyword name
    const keywordsMap: Record<string, typeof keywords[0]> = {};
    (keywords || []).forEach(kw => {
      const key = `${kw.keyword}_${kw.match_type}`;
      if (!keywordsMap[key]) {
        keywordsMap[key] = { ...kw, cost: 0, clicks: 0, impressions: 0, conversions: 0 };
      }
      keywordsMap[key].cost += kw.cost || 0;
      keywordsMap[key].clicks += kw.clicks || 0;
      keywordsMap[key].impressions += kw.impressions || 0;
      keywordsMap[key].conversions += kw.conversions || 0;
    });

    // Aggregate search terms
    const searchTermsMap: Record<string, typeof searchTerms[0]> = {};
    (searchTerms || []).forEach(term => {
      if (!searchTermsMap[term.query]) {
        searchTermsMap[term.query] = { ...term, cost: 0, clicks: 0, impressions: 0, conversions: 0 };
      }
      searchTermsMap[term.query].cost += term.cost || 0;
      searchTermsMap[term.query].clicks += term.clicks || 0;
      searchTermsMap[term.query].impressions += term.impressions || 0;
      searchTermsMap[term.query].conversions += term.conversions || 0;
    });

    return NextResponse.json({
      campaigns: campaigns || [],
      keywords: Object.values(keywordsMap),
      searchTerms: Object.values(searchTermsMap),
      dailySummary,
    });

  } catch (error) {
    console.error('Google Ads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
