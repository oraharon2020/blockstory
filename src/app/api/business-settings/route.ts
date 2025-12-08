import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Convert snake_case from DB to camelCase for frontend
function toCamelCase(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(toCamelCase);
  }
  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Business settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trim string values to avoid issues with leading/trailing spaces
    const trimmedData = data ? {
      ...data,
      woo_url: data.woo_url?.trim(),
      consumer_key: data.consumer_key?.trim(),
      consumer_secret: data.consumer_secret?.trim(),
    } : null;

    return NextResponse.json({ data: toCamelCase(trimmedData) });
  } catch (error) {
    console.error('Business settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, ...settings } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    // Convert camelCase to snake_case and trim string values
    const dbData: any = {
      business_id: businessId,
      woo_url: settings.wooUrl?.trim(),
      consumer_key: settings.consumerKey?.trim(),
      consumer_secret: settings.consumerSecret?.trim(),
      vat_rate: settings.vatRate,
      credit_card_rate: settings.creditCardRate,
      credit_fee_mode: settings.creditFeeMode || 'percentage',
      expenses_spread_mode: settings.expensesSpreadMode || 'exact',
      shipping_cost: settings.shippingCost,
      materials_rate: settings.materialsRate,
      valid_order_statuses: settings.validOrderStatuses || ['completed', 'processing'],
      manual_shipping_per_item: settings.manualShippingPerItem ?? false,
      charge_shipping_on_free_orders: settings.chargeShippingOnFreeOrders ?? true,
      free_shipping_methods: settings.freeShippingMethods || ['local_pickup'],
      // Google Ads settings
      google_ads_webhook_secret: settings.googleAdsWebhookSecret,
      google_ads_auto_sync: settings.googleAdsAutoSync,
      google_ads_customer_id: settings.googleAdsCustomerId,
      updated_at: new Date().toISOString(),
    };

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('business_settings')
      .select('id')
      .eq('business_id', businessId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('business_settings')
        .update(dbData)
        .eq('business_id', businessId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('business_settings')
        .insert(dbData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Business settings save error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(result.data) });
  } catch (error) {
    console.error('Business settings save error:', error);
    return NextResponse.json(
      { error: 'Failed to save business settings' },
      { status: 500 }
    );
  }
}
