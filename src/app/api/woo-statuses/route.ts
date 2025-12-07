import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

// Default WooCommerce statuses
const DEFAULT_STATUSES = [
  { slug: 'pending', name: 'ממתין לתשלום', name_en: 'Pending payment' },
  { slug: 'processing', name: 'בטיפול', name_en: 'Processing' },
  { slug: 'on-hold', name: 'בהמתנה', name_en: 'On hold' },
  { slug: 'completed', name: 'הושלם', name_en: 'Completed' },
  { slug: 'cancelled', name: 'בוטל', name_en: 'Cancelled' },
  { slug: 'refunded', name: 'הוחזר', name_en: 'Refunded' },
  { slug: 'failed', name: 'נכשל', name_en: 'Failed' },
  { slug: 'trash', name: 'אשפה', name_en: 'Trash' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Try to fetch from WooCommerce if we have business settings
    let wooStatuses: any[] = [];
    let errorMessage = '';
    
    if (businessId) {
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('woo_url, consumer_key, consumer_secret')
        .eq('business_id', businessId)
        .single();

      if (businessSettings?.woo_url && businessSettings?.consumer_key) {
        try {
          const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
          const api = new WooCommerceRestApi({
            url: businessSettings.woo_url.trim(),
            consumerKey: businessSettings.consumer_key.trim(),
            consumerSecret: businessSettings.consumer_secret.trim(),
            version: 'wc/v3',
          });

          // Fetch order statuses from WooCommerce reports
          const response = await api.get('reports/orders/totals');
          console.log('WooCommerce statuses response:', response.data);
          
          if (response.data && Array.isArray(response.data)) {
            wooStatuses = response.data.map((s: any) => ({
              slug: s.slug,
              name: s.name,
              total: s.total,
            }));
          }
        } catch (wooError: any) {
          console.error('WooCommerce status fetch error:', wooError.message);
          errorMessage = wooError.message;
        }
      } else {
        console.log('No WooCommerce credentials found for business:', businessId);
      }
    }

    // Use WooCommerce statuses if available, otherwise defaults
    const statuses = wooStatuses.length > 0 ? wooStatuses : DEFAULT_STATUSES;

    return NextResponse.json({ 
      statuses,
      source: wooStatuses.length > 0 ? 'woocommerce' : 'default',
      ...(errorMessage && { warning: errorMessage })
    });

  } catch (error: any) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ 
      statuses: DEFAULT_STATUSES,
      source: 'default',
      error: error.message 
    });
  }
}
