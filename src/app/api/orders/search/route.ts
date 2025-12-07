import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const businessId = searchParams.get('businessId');

    if (!search || search.length < 2) {
      return NextResponse.json({ results: [] });
    }

    let wooUrl: string | undefined;
    let consumerKey: string | undefined;
    let consumerSecret: string | undefined;

    // Check for business-specific settings first
    if (businessId) {
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();
      
      if (businessSettings) {
        wooUrl = businessSettings.woo_url?.trim();
        consumerKey = businessSettings.consumer_key?.trim();
        consumerSecret = businessSettings.consumer_secret?.trim();
      }
    }

    // Fall back to global settings if no business settings
    if (!wooUrl || !consumerKey || !consumerSecret) {
      const { data: settingsData } = await supabase
        .from(TABLES.SETTINGS)
        .select('key, value');

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
      return NextResponse.json({ results: [] });
    }

    // Fetch orders from WooCommerce
    const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
    const api = new WooCommerceRestApi({
      url: wooUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
    });

    const searchParams2: Record<string, any> = {
      per_page: 20,
    };

    // Add date range if provided
    if (startDate) {
      searchParams2.after = `${startDate}T00:00:00`;
    }
    if (endDate) {
      searchParams2.before = `${endDate}T23:59:59`;
    }

    // Check if search is a number (order ID)
    const isOrderId = /^\d+$/.test(search);
    
    let results: {date: string, orderId: string, customerName: string}[] = [];

    if (isOrderId) {
      // Search by order ID
      try {
        const response = await api.get(`orders/${search}`);
        if (response.data) {
          const order = response.data;
          results.push({
            date: order.date_created.split('T')[0],
            orderId: String(order.id),
            customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'לקוח',
          });
        }
      } catch (e) {
        // Order not found, try searching
      }
    }
    
    // Also search by customer name/email
    if (results.length === 0) {
      const response = await api.get('orders', {
        ...searchParams2,
        search: search,
      });

      results = (response.data || []).map((order: any) => ({
        date: order.date_created.split('T')[0],
        orderId: String(order.id),
        customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'לקוח',
      }));
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in orders search:', error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
