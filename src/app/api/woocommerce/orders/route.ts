import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const businessId = searchParams.get('businessId') || '01294f31-38fa-4bd5-86fd-266d076ec57e';

    // Get WooCommerce credentials from business_integrations
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('credentials')
      .eq('business_id', businessId)
      .eq('type', 'woocommerce')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'WooCommerce integration not found' }, { status: 404 });
    }

    const { store_url, consumer_key, consumer_secret } = integration.credentials;

    // Search WooCommerce orders
    const url = new URL(`${store_url}/wp-json/wc/v3/orders`);
    url.searchParams.set('search', search);
    url.searchParams.set('per_page', '20');
    url.searchParams.set('orderby', 'date');
    url.searchParams.set('order', 'desc');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64'),
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const orders = await response.json();

    // Return simplified order data
    const simplifiedOrders = orders.map((order: any) => ({
      id: order.id,
      number: order.number,
      date_created: order.date_created,
      status: order.status,
      total: order.total,
      billing: {
        first_name: order.billing?.first_name || '',
        last_name: order.billing?.last_name || '',
        email: order.billing?.email || '',
      },
      coupon_lines: order.coupon_lines || [],
    }));

    return NextResponse.json({ orders: simplifiedOrders });
  } catch (error) {
    console.error('WooCommerce orders API error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
