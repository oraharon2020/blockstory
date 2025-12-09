import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleAdsApi } from 'google-ads-api';

export const dynamic = 'force-dynamic';

// Google Ads API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '365551544962-hi7tqlt88mgmdlpact7jgu6v27tmok5k.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'XpnDkpbdkgWtNJmZ-F9hng';

// GET - List accessible Google Ads accounts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  try {
    // Get business settings with refresh token
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('google_ads_refresh_token')
      .eq('business_id', businessId)
      .single();

    if (settingsError || !settings?.google_ads_refresh_token) {
      return NextResponse.json({ 
        error: 'Google Ads not connected',
        needsAuth: true 
      }, { status: 401 });
    }

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      developer_token: DEVELOPER_TOKEN,
    });

    // List accessible customers
    const customers = await client.listAccessibleCustomers(settings.google_ads_refresh_token);

    // Get details for each customer
    const accountDetails = await Promise.all(
      customers.resource_names.map(async (resourceName: string) => {
        const customerId = resourceName.replace('customers/', '');
        try {
          const customer = client.Customer({
            customer_id: customerId,
            refresh_token: settings.google_ads_refresh_token,
          });

          const [details] = await customer.query(`
            SELECT
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.manager
            FROM customer
            LIMIT 1
          `);

          return {
            id: customerId,
            name: details.customer?.descriptive_name || customerId,
            currency: details.customer?.currency_code,
            timeZone: details.customer?.time_zone,
            isManager: details.customer?.manager || false,
          };
        } catch (err) {
          return {
            id: customerId,
            name: customerId,
            error: 'Could not fetch details',
          };
        }
      })
    );

    return NextResponse.json({ accounts: accountDetails });

  } catch (error: any) {
    console.error('List accounts error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to list accounts' 
    }, { status: 500 });
  }
}

// POST - Set selected Google Ads account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, customerId } = body;

    if (!businessId || !customerId) {
      return NextResponse.json({ error: 'Missing businessId or customerId' }, { status: 400 });
    }

    // Save selected customer ID
    const { error: dbError } = await supabase
      .from('business_settings')
      .update({
        google_ads_customer_id: customerId,
      })
      .eq('business_id', businessId);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
