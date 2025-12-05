import { NextRequest, NextResponse } from 'next/server';
import { createWooCommerceClient, fetchOrdersByDate, calculateDailyStats } from '@/lib/woocommerce';
import { supabase, TABLES } from '@/lib/supabase';
import { 
  calculateVAT, 
  calculateCreditCardFees, 
  calculateMaterialsCost,
  calculateProfit,
  calculateROI 
} from '@/lib/calculations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, wooUrl, consumerKey, consumerSecret, materialsRate = 0.3 } = body;

    if (!date || !wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create WooCommerce client
    const wooClient = createWooCommerceClient(wooUrl, consumerKey, consumerSecret);

    // Fetch orders for the date
    const orders = await fetchOrdersByDate(wooClient, date);
    
    // Debug log
    console.log(`📅 Syncing ${date}: Found ${orders.length} orders`);
    if (orders.length > 0) {
      orders.forEach((o: any) => {
        console.log(`  - Order #${o.id}: ${o.total} (status: ${o.status}, date: ${o.date_created})`);
      });
    }
    
    const stats = calculateDailyStats(orders);

    // Calculate all metrics
    const revenue = stats.revenue;
    const materialsCost = calculateMaterialsCost(revenue, materialsRate);
    const creditCardFees = calculateCreditCardFees(revenue);
    const vat = calculateVAT(revenue);

    // Get existing data for manual entries (ads costs)
    const { data: existingData } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('google_ads_cost, facebook_ads_cost')
      .eq('date', date)
      .single();

    const googleAdsCost = existingData?.google_ads_cost || 0;
    const facebookAdsCost = existingData?.facebook_ads_cost || 0;

    const totalExpenses = googleAdsCost + facebookAdsCost + stats.shippingCost + materialsCost + creditCardFees + vat;
    const profit = calculateProfit(revenue, totalExpenses);
    const roi = calculateROI(profit, totalExpenses);

    const dailyData = {
      date,
      revenue,
      orders_count: stats.ordersCount,
      google_ads_cost: googleAdsCost,
      facebook_ads_cost: facebookAdsCost,
      shipping_cost: stats.shippingCost,
      materials_cost: materialsCost,
      credit_card_fees: creditCardFees,
      vat,
      total_expenses: totalExpenses,
      profit,
      roi,
      updated_at: new Date().toISOString(),
    };

    // Upsert to Supabase
    console.log(`💾 Saving to Supabase: ${date} - Revenue: ${revenue}`);
    
    const { data, error } = await supabase
      .from(TABLES.DAILY_DATA)
      .upsert(dailyData, { onConflict: 'date' })
      .select()
      .single();

    if (error) {
      console.error(`❌ Supabase error for ${date}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Saved ${date} successfully`);
    
    return NextResponse.json({ 
      data,
      ordersCount: orders.length,
      message: `Synced ${orders.length} orders for ${date}` 
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
