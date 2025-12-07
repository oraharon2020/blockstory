import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase, TABLES } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const businessId = searchParams.get('businessId');

    console.log(`📦 Orders API: date=${date}, businessId=${businessId}`);

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    let wooUrl: string | undefined;
    let consumerKey: string | undefined;
    let consumerSecret: string | undefined;

    // Check for business-specific settings first
    if (businessId) {
      console.log(`🔍 Looking for business settings for: ${businessId}`);
      const { data: businessSettings, error: settingsError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();
      
      console.log(`📋 Business settings result:`, businessSettings, settingsError);
      
      if (businessSettings) {
        wooUrl = businessSettings.woo_url?.trim();
        consumerKey = businessSettings.consumer_key?.trim();
        consumerSecret = businessSettings.consumer_secret?.trim();
        console.log(`✅ Found business settings, wooUrl: ${wooUrl}`);
      }
    }

    // Fall back to global settings if no business settings
    if (!wooUrl || !consumerKey || !consumerSecret) {
      const { data: settingsData } = await supabase
        .from(TABLES.SETTINGS)
        .select('key, value');

      // Convert to object
      const settings: Record<string, string> = {};
      if (settingsData) {
        settingsData.forEach((item: { key: string; value: string }) => {
          settings[item.key] = item.value;
        });
      }
      
      wooUrl = wooUrl || settings.wooUrl;
      consumerKey = consumerKey || settings.consumerKey;
      consumerSecret = consumerSecret || settings.consumerSecret;
    }

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'WooCommerce not configured' },
        { status: 400 }
      );
    }

    // Fetch orders from WooCommerce
    const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
    const api = new WooCommerceRestApi({
      url: wooUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
    });

    const response = await api.get('orders', {
      after: `${date}T00:00:00`,
      before: `${date}T23:59:59`,
      per_page: 100,
      orderby: 'date',
      order: 'desc',
      dates_are_gmt: false,
    });

    return NextResponse.json({ orders: response.data });

  } catch (error: any) {
    console.error('Orders fetch error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders', details: error.toString() },
      { status: 500 }
    );
  }
}
