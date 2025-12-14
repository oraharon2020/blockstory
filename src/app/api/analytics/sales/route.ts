/**
 * Sales Analytics API
 * 
 * נתוני מכירות משולבים: GA4 (Funnel) + WooCommerce (רכישות אמיתיות)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesAnalytics, getValidCredentials } from '@/lib/google-analytics';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper to ensure end date is not in the future
function getMaxEndDate(endDate: string): string {
  if (endDate === 'today' || endDate === 'yesterday') {
    return endDate;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const requestedEnd = new Date(endDate);
  requestedEnd.setHours(0, 0, 0, 0);
  
  if (requestedEnd > today) {
    return today.toISOString().split('T')[0];
  }
  
  return endDate;
}

// Convert date string to actual date for WooCommerce API
function getActualDate(dateStr: string): string {
  if (dateStr === 'today') {
    return new Date().toISOString().split('T')[0];
  }
  if (dateStr === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  if (dateStr.includes('daysAgo')) {
    const days = parseInt(dateStr.replace('daysAgo', ''));
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }
  return dateStr;
}

// Fetch real orders from WooCommerce
async function getWooCommerceOrders(businessId: string, startDate: string, endDate: string) {
  // Get WooCommerce credentials AND valid order statuses - using correct column names
  const { data: settings } = await supabase
    .from('business_settings')
    .select('woo_url, consumer_key, consumer_secret, valid_order_statuses')
    .eq('business_id', businessId)
    .single();

  console.log('🛒 WooCommerce settings check:', { 
    hasUrl: !!settings?.woo_url, 
    hasKey: !!settings?.consumer_key,
    validStatuses: settings?.valid_order_statuses?.length || 0,
    businessId 
  });

  if (!settings?.woo_url || !settings?.consumer_key) {
    console.log('❌ No WooCommerce credentials found');
    return null;
  }

  // Get valid statuses from settings, or use defaults
  const validOrderStatuses: string[] = settings.valid_order_statuses || ['completed', 'processing', 'on-hold'];
  
  console.log('📋 Valid order statuses from settings:', validOrderStatuses.join(', '));

  const actualStart = getActualDate(startDate);
  const actualEnd = getActualDate(endDate);

  try {
    const url = `${settings.woo_url}/wp-json/wc/v3/orders?after=${actualStart}T00:00:00&before=${actualEnd}T23:59:59&per_page=100&consumer_key=${settings.consumer_key}&consumer_secret=${settings.consumer_secret}`;
    
    console.log('🛒 Fetching WooCommerce orders for:', actualStart, '-', actualEnd);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log('❌ WooCommerce API error:', response.status);
      return null;
    }
    
    const orders = await response.json();
    
    console.log('🛒 WooCommerce raw orders count:', orders.length);
    
    // Filter only orders with valid statuses (from settings)
    const validOrders = orders.filter((o: any) => 
      validOrderStatuses.includes(o.status)
    );
    
    console.log('✅ WooCommerce valid orders:', validOrders.length, '(using statuses from settings)');
    
    const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
    
    return {
      orderCount: validOrders.length,
      totalRevenue,
      orders: validOrders.map((o: any) => ({
        id: o.id,
        date: o.date_created,
        total: parseFloat(o.total),
        status: o.status,
        paymentMethod: o.payment_method,
      })),
    };
  } catch (error) {
    console.error('WooCommerce fetch error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = getMaxEndDate(searchParams.get('endDate') || 'today');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get valid credentials (with auto-refresh)
    const result = await getValidCredentials(businessId);
    
    if ('error' in result) {
      return NextResponse.json(result, { status: result.needsAuth ? 401 : 400 });
    }

    const data = await getSalesAnalytics(result.credentials, { startDate, endDate });

    // Get real orders from WooCommerce
    const wcOrders = await getWooCommerceOrders(businessId, startDate, endDate);
    
    // If we have WooCommerce data, use it to correct the funnel
    if (wcOrders) {
      const realPurchases = wcOrders.orderCount;
      const realRevenue = wcOrders.totalRevenue;
      
      // Update the funnel with real purchase data
      const funnelWithRealData = data.funnel.map(step => {
        if (step.step === 'רכישה') {
          return { ...step, users: realPurchases };
        }
        return step;
      });
      
      // Recalculate dropoff for purchase step
      // If more purchases than checkout starts (due to bank transfers etc.), show 0% dropoff
      const checkoutUsers = funnelWithRealData.find(s => s.step === 'התחלת תשלום')?.users || 0;
      const purchaseIndex = funnelWithRealData.findIndex(s => s.step === 'רכישה');
      if (purchaseIndex > 0) {
        const dropoff = checkoutUsers > 0 
          ? Math.max(0, Math.round(((checkoutUsers - realPurchases) / checkoutUsers) * 100))
          : 0;
        funnelWithRealData[purchaseIndex].dropoff = dropoff;
      }
      
      // Calculate real cart abandonment (can't be negative)
      const addToCartUsers = data.funnel.find(s => s.step === 'הוספה לעגלה')?.users || 0;
      const realCartAbandonment = addToCartUsers > 0 
        ? Math.max(0, Math.round(((addToCartUsers - realPurchases) / addToCartUsers) * 100))
        : 0;
      
      // Calculate real conversion rate
      const viewUsers = data.funnel.find(s => s.step === 'צפייה במוצר')?.users || 0;
      const realConversionRate = viewUsers > 0 ? (realPurchases / viewUsers) * 100 : 0;
      
      // Real AOV
      const realAvgOrderValue = realPurchases > 0 ? realRevenue / realPurchases : 0;
      
      return NextResponse.json({
        ...data,
        funnel: funnelWithRealData,
        cartAbandonment: realCartAbandonment,
        conversionRate: realConversionRate,
        avgOrderValue: realAvgOrderValue,
        // Add real data section
        realData: {
          source: 'WooCommerce',
          purchases: realPurchases,
          revenue: realRevenue,
          ga4Purchases: data.funnel.find(s => s.step === 'רכישה')?.users || 0,
          discrepancy: realPurchases - (data.funnel.find(s => s.step === 'רכישה')?.users || 0),
        },
      });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Sales API Error:', error);
    
    // Check if it's an auth error
    if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_request')) {
      return NextResponse.json({ 
        error: 'Token expired, please reconnect Google Analytics',
        needsAuth: true 
      }, { status: 401 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
