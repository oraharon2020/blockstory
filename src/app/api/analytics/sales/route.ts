/**
 * Sales Analytics API
 * 
 * נתוני מכירות מ-GA4: Funnel, נטישת עגלה, המרות
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesAnalytics, GACredentials } from '@/lib/google-analytics';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = searchParams.get('endDate') || 'today';

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get GA credentials
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

    const data = await getSalesAnalytics(credentials, { startDate, endDate });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Sales API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
