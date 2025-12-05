import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    // Get WooCommerce settings
    const { data: settings } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .single();

    if (!settings?.wooUrl || !settings?.consumerKey || !settings?.consumerSecret) {
      return NextResponse.json(
        { error: 'WooCommerce not configured' },
        { status: 400 }
      );
    }

    // Fetch orders from WooCommerce
    const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
    const api = new WooCommerceRestApi({
      url: settings.wooUrl,
      consumerKey: settings.consumerKey,
      consumerSecret: settings.consumerSecret,
      version: 'wc/v3',
    });

    const response = await api.get('orders', {
      after: `${date}T00:00:00`,
      before: `${date}T23:59:59`,
      per_page: 100,
      orderby: 'date',
      order: 'desc',
    });

    return NextResponse.json({ orders: response.data });

  } catch (error: any) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
