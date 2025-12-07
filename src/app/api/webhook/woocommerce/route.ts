import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { 
  calculateVAT, 
  calculateCreditCardFees, 
  calculateMaterialsCost,
  calculateProfit,
  calculateROI 
} from '@/lib/calculations';

// Valid order statuses that count as revenue
const VALID_STATUSES = ['completed', 'processing', 'on-hold'];
const CANCELLED_STATUSES = ['cancelled', 'refunded', 'failed'];

// GET handler for webhook verification (WooCommerce sends a ping)
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint ready' });
}

// WooCommerce Webhook handler
// This endpoint receives real-time order notifications from WooCommerce
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const topic = request.headers.get('x-wc-webhook-topic');
    
    // Handle ping/verification request (WooCommerce sends form data for ping)
    if (!contentType.includes('application/json')) {
      console.log('📥 Webhook ping received');
      return NextResponse.json({ status: 'ok', message: 'Webhook verified' });
    }

    const body = await request.json();
    
    // Handle empty body or ping
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ status: 'ok', message: 'Ping received' });
    }
    
    console.log(`📥 Webhook received - Topic: ${topic}`);

    if (!topic?.includes('order')) {
      return NextResponse.json({ message: 'Not an order event' });
    }

    // Extract order data
    const order = body;
    const orderId = order.id;
    const orderStatus = order.status;
    const orderDate = order.date_created?.split('T')[0] || new Date().toISOString().split('T')[0];
    const orderTotal = parseFloat(order.total || '0');
    const shippingTotal = parseFloat(order.shipping_total || '0');

    console.log(`📦 Order ${orderId} - Status: ${orderStatus}, Total: ${orderTotal}`);

    // Get settings for rates (key-value format)
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

    const materialsRate = (parseFloat(settings.materialsRate) || 30) / 100;
    const vatRate = (parseFloat(settings.vatRate) || 18) / 100;
    const creditCardRate = (parseFloat(settings.creditCardRate) || 2.5) / 100;

    // Handle different webhook topics
    if (topic === 'order.created') {
      // Only count valid statuses
      if (!VALID_STATUSES.includes(orderStatus)) {
        console.log(`⏭️ Order ${orderId} skipped - status: ${orderStatus}`);
        return NextResponse.json({ message: 'Order status not counted', orderId, status: orderStatus });
      }
      
      await updateDailyData(orderDate, orderTotal, shippingTotal, 1, settings);
      
    } else if (topic === 'order.updated') {
      // For updates, we need to recalculate the entire day
      // This handles status changes (e.g., processing -> cancelled)
      await recalculateDayFromWooCommerce(orderDate, settings);
      
    } else if (topic === 'order.deleted') {
      // Order was deleted, recalculate the day
      await recalculateDayFromWooCommerce(orderDate, settings);
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      topic,
      date: orderDate,
      total: orderTotal 
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to update daily data incrementally
async function updateDailyData(
  date: string, 
  orderTotal: number, 
  shippingTotal: number, 
  orderCountDelta: number,
  settings: any
) {
  const materialsRate = (settings?.materialsRate || 30) / 100;
  const vatRate = (settings?.vatRate || 18) / 100;
  const creditCardRate = (settings?.creditCardRate || 2.5) / 100;

  // Get current daily data
  const { data: existingData } = await supabase
    .from(TABLES.DAILY_DATA)
    .select('*')
    .eq('date', date)
    .single();

  // Calculate new values
  const newRevenue = (existingData?.revenue || 0) + orderTotal;
  const newOrdersCount = (existingData?.ordersCount || 0) + orderCountDelta;
  const newShippingCost = (existingData?.shippingCost || 0) + shippingTotal;
  
  // Recalculate derived values
  const materialsCost = newRevenue * materialsRate;
  const creditCardFees = newRevenue * creditCardRate;
  const vat = newRevenue * vatRate;
  
  const googleAdsCost = existingData?.googleAdsCost || 0;
  const facebookAdsCost = existingData?.facebookAdsCost || 0;
  const tiktokAdsCost = existingData?.tiktokAdsCost || 0;
  
  const totalExpenses = googleAdsCost + facebookAdsCost + tiktokAdsCost + newShippingCost + materialsCost + creditCardFees + vat;
  const profit = newRevenue - totalExpenses;
  const roi = newRevenue > 0 ? (profit / newRevenue) * 100 : 0;

  // Upsert to database
  const { error } = await supabase
    .from(TABLES.DAILY_DATA)
    .upsert({
      date,
      revenue: newRevenue,
      ordersCount: Math.max(0, newOrdersCount),
      shippingCost: newShippingCost,
      materialsCost,
      creditCardFees,
      vat,
      googleAdsCost,
      facebookAdsCost,
      tiktokAdsCost,
      totalExpenses,
      profit,
      roi,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'date' });

  if (error) {
    console.error('DB update error:', error);
    throw error;
  }

  console.log(`✅ Updated ${date} - Revenue: ${newRevenue}, Orders: ${newOrdersCount}`);
}

// Helper function to recalculate a day by fetching all orders from WooCommerce
async function recalculateDayFromWooCommerce(date: string, settings: any) {
  console.log(`🔄 Recalculating day: ${date}`);
  
  // Get WooCommerce settings
  const wooUrl = settings?.wooUrl;
  const consumerKey = settings?.consumerKey;
  const consumerSecret = settings?.consumerSecret;

  if (!wooUrl || !consumerKey || !consumerSecret) {
    console.log('⚠️ WooCommerce settings not configured, skipping recalculation');
    return;
  }

  try {
    // Fetch all orders for this date from WooCommerce
    const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
    const api = new WooCommerceRestApi({
      url: wooUrl,
      consumerKey,
      consumerSecret,
      version: 'wc/v3',
    });

    const response = await api.get('orders', {
      after: `${date}T00:00:00`,
      before: `${date}T23:59:59`,
      per_page: 100,
      status: VALID_STATUSES,
    });

    const orders = response.data;
    
    // Calculate totals from all valid orders
    let totalRevenue = 0;
    let totalShipping = 0;
    let ordersCount = 0;

    for (const order of orders) {
      totalRevenue += parseFloat(order.total || '0');
      totalShipping += parseFloat(order.shipping_total || '0');
      ordersCount++;
    }

    const materialsRate = (settings?.materialsRate || 30) / 100;
    const vatRate = (settings?.vatRate || 18) / 100;
    const creditCardRate = (settings?.creditCardRate || 2.5) / 100;

    const materialsCost = totalRevenue * materialsRate;
    const creditCardFees = totalRevenue * creditCardRate;
    const vat = totalRevenue * vatRate;

    // Get existing manual entries
    const { data: existingData } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('googleAdsCost, facebookAdsCost, tiktokAdsCost')
      .eq('date', date)
      .single();

    const googleAdsCost = existingData?.googleAdsCost || 0;
    const facebookAdsCost = existingData?.facebookAdsCost || 0;
    const tiktokAdsCost = existingData?.tiktokAdsCost || 0;

    const totalExpenses = googleAdsCost + facebookAdsCost + tiktokAdsCost + totalShipping + materialsCost + creditCardFees + vat;
    const profit = totalRevenue - totalExpenses;
    const roi = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Update database
    const { error } = await supabase
      .from(TABLES.DAILY_DATA)
      .upsert({
        date,
        revenue: totalRevenue,
        ordersCount,
        shippingCost: totalShipping,
        materialsCost,
        creditCardFees,
        vat,
        googleAdsCost,
        facebookAdsCost,
        tiktokAdsCost,
        totalExpenses,
        profit,
        roi,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' });

    if (error) throw error;

    console.log(`✅ Recalculated ${date} - Revenue: ${totalRevenue}, Orders: ${ordersCount}`);

  } catch (error) {
    console.error(`❌ Error recalculating ${date}:`, error);
    throw error;
  }
}
