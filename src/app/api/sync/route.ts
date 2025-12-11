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

export const dynamic = 'force-dynamic';

// GET handler - sync using stored credentials
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const businessId = searchParams.get('businessId');

  if (!date || !businessId) {
    return NextResponse.json(
      { error: 'Missing required parameters: date and businessId' },
      { status: 400 }
    );
  }

  try {
    // Get WooCommerce credentials from business_settings
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('woo_url, consumer_key, consumer_secret, materials_rate, shipping_cost, valid_order_statuses, charge_shipping_on_free_orders, free_shipping_methods')
      .eq('business_id', businessId)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Business settings not found' },
        { status: 404 }
      );
    }

    if (!settings.woo_url || !settings.consumer_key || !settings.consumer_secret) {
      return NextResponse.json(
        { error: 'WooCommerce credentials not configured' },
        { status: 400 }
      );
    }

    // Call the sync logic with stored credentials
    // Convert materials_rate from percentage (30) to decimal (0.30) if needed
    const materialsRate = settings.materials_rate 
      ? (settings.materials_rate > 1 ? settings.materials_rate / 100 : settings.materials_rate)
      : 0.3;

    return await syncData({
      date,
      wooUrl: settings.woo_url,
      consumerKey: settings.consumer_key,
      consumerSecret: settings.consumer_secret,
      materialsRate,
      shippingCost: settings.shipping_cost || 0,
      businessId,
      validOrderStatuses: settings.valid_order_statuses,
      chargeShippingOnFreeOrders: settings.charge_shipping_on_free_orders ?? true,
      freeShippingMethods: settings.free_shipping_methods,
    });
  } catch (error: any) {
    console.error('GET Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, wooUrl, consumerKey, consumerSecret, materialsRate = 0.3, shippingCost = 0, businessId, validOrderStatuses } = body;

    if (!date || !wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get settings from business settings
    let chargeShippingOnFreeOrders = true;
    let freeShippingMethods = ['local_pickup', 'pickup_location', 'pickup', 'store_pickup'];
    
    if (businessId) {
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('charge_shipping_on_free_orders, free_shipping_methods')
        .eq('business_id', businessId)
        .single();
      
      if (businessSettings) {
        chargeShippingOnFreeOrders = businessSettings.charge_shipping_on_free_orders ?? true;
        freeShippingMethods = businessSettings.free_shipping_methods || freeShippingMethods;
      }
    }

    return await syncData({
      date,
      wooUrl,
      consumerKey,
      consumerSecret,
      materialsRate,
      shippingCost,
      businessId,
      validOrderStatuses,
      chargeShippingOnFreeOrders,
      freeShippingMethods,
    });
  } catch (error: any) {
    console.error('POST Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

// Shared sync logic
async function syncData(params: {
  date: string;
  wooUrl: string;
  consumerKey: string;
  consumerSecret: string;
  materialsRate: number;
  shippingCost: number;
  businessId?: string;
  validOrderStatuses?: string[];
  chargeShippingOnFreeOrders?: boolean;
  freeShippingMethods?: string[];
}) {
  const {
    date,
    wooUrl,
    consumerKey,
    consumerSecret,
    materialsRate,
    shippingCost,
    businessId,
    validOrderStatuses,
    chargeShippingOnFreeOrders = true,
    freeShippingMethods = ['local_pickup', 'pickup_location', 'pickup', 'store_pickup'],
  } = params;

  // Create WooCommerce client
  const wooClient = createWooCommerceClient(wooUrl, consumerKey, consumerSecret);

  // Fetch orders for the date with valid statuses
  const orders = await fetchOrdersByDate(wooClient, date, validOrderStatuses);
  
  // Debug log
  console.log(`📅 Syncing ${date}: Found ${orders.length} orders (statuses: ${validOrderStatuses?.join(', ') || 'default'})`);
  if (orders.length > 0) {
    orders.forEach((o: any) => {
      console.log(`  - Order #${o.id}: ${o.total} (status: ${o.status}, date: ${o.date_created})`);
    });
  }
  
  // Pass fixed shipping cost to calculate stats (with free shipping consideration)
  const stats = calculateDailyStats(orders, shippingCost, chargeShippingOnFreeOrders, freeShippingMethods);

  // Check if manual shipping per item is enabled and get manual shipping costs
  let manualShippingCost = 0;
  if (businessId) {
    // Check business settings for manual_shipping_per_item
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('manual_shipping_per_item')
      .eq('business_id', businessId)
      .single();
    
    if (businessSettings?.manual_shipping_per_item) {
      // Get all order IDs from today's orders
      const orderIds = orders.map((o: any) => o.id);
      
      if (orderIds.length > 0) {
        // Sum all manual shipping costs for these orders
        const { data: itemCosts } = await supabase
          .from(TABLES.ORDER_ITEM_COSTS)
          .select('shipping_cost')
          .in('order_id', orderIds)
          .eq('business_id', businessId);
          
        if (itemCosts) {
          manualShippingCost = itemCosts.reduce((sum, item) => sum + (parseFloat(item.shipping_cost) || 0), 0);
        }
      }
    }
  }
  
  // Use manual shipping cost if available, otherwise use calculated shipping cost
  const finalShippingCost = manualShippingCost > 0 ? manualShippingCost : stats.shippingCost;

  // Calculate all metrics
  const revenue = stats.revenue;
  const materialsCost = calculateMaterialsCost(revenue, materialsRate);
  const creditCardFees = calculateCreditCardFees(revenue);
  const vat = calculateVAT(revenue);

  // ========== NEW: Calculate employee daily cost ==========
  let employeeCost = 0;
  if (businessId) {
    const syncDate = new Date(date);
    const syncMonth = syncDate.getMonth() + 1; // 1-12
    const syncYear = syncDate.getFullYear();
    const daysInMonth = new Date(syncYear, syncMonth, 0).getDate();
    
    const { data: employees } = await supabase
      .from('employees')
      .select('salary')
      .eq('business_id', businessId)
      .eq('month', syncMonth)
      .eq('year', syncYear);
    
    if (employees && employees.length > 0) {
      const totalMonthlySalary = employees.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);
      employeeCost = totalMonthlySalary / daysInMonth;
    }
  }

  // ========== NEW: Calculate refunds for this day ==========
  let refundsAmount = 0;
  if (businessId) {
    const { data: refunds } = await supabase
      .from('customer_refunds')
      .select('amount')
      .eq('business_id', businessId)
      .eq('refund_date', date);
    
    if (refunds && refunds.length > 0) {
      refundsAmount = refunds.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    }
  }

  // ========== NEW: Calculate expenses (VAT and No VAT) ==========
  let expensesVatAmount = 0;
  let expensesNoVatAmount = 0;
  
  if (businessId) {
    const syncDate = new Date(date);
    const syncMonth = syncDate.getMonth() + 1;
    const syncYear = syncDate.getFullYear();
    const daysInMonth = new Date(syncYear, syncMonth, 0).getDate();
    const monthStart = `${syncYear}-${String(syncMonth).padStart(2, '0')}-01`;
    const monthEnd = `${syncYear}-${String(syncMonth).padStart(2, '0')}-${daysInMonth}`;
    
    // Get expenses spread mode from settings
    const { data: expenseSettings } = await supabase
      .from('business_settings')
      .select('expenses_spread_mode')
      .eq('business_id', businessId)
      .single();
    
    const spreadMode = expenseSettings?.expenses_spread_mode || 'exact';
    
    // Get expenses with VAT for this month
    const { data: expensesVat } = await supabase
      .from('expenses_vat')
      .select('amount, expense_date')
      .eq('business_id', businessId)
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd);
    
    // Get expenses without VAT for this month
    const { data: expensesNoVat } = await supabase
      .from('expenses_no_vat')
      .select('amount, expense_date')
      .eq('business_id', businessId)
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd);
    
    if (spreadMode === 'spread') {
      // Spread all monthly expenses across all days
      const totalVat = expensesVat?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;
      const totalNoVat = expensesNoVat?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;
      expensesVatAmount = totalVat / daysInMonth;
      expensesNoVatAmount = totalNoVat / daysInMonth;
    } else {
      // Exact date mode - only count expenses from this specific date
      expensesVatAmount = expensesVat?.filter(e => e.expense_date === date)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;
      expensesNoVatAmount = expensesNoVat?.filter(e => e.expense_date === date)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;
    }
  }

  // ========== Get existing manual entries (for Facebook/TikTok that are entered manually) ==========
  let existingFacebookCost = 0;
  let existingTiktokCost = 0;
  if (businessId) {
    const { data: existingData } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('facebook_ads_cost, tiktok_ads_cost')
      .eq('date', date)
      .eq('business_id', businessId)
      .single();
    
    existingFacebookCost = existingData?.facebook_ads_cost || 0;
    existingTiktokCost = existingData?.tiktok_ads_cost || 0;
  }

  // ========== Get Google Ads cost from google_ads_campaigns table ==========
  let googleAdsCost = 0;
  if (businessId) {
    const { data: googleAdsData } = await supabase
      .from('google_ads_campaigns')
      .select('cost')
      .eq('business_id', businessId)
      .eq('date', date);
    
    googleAdsCost = googleAdsData?.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0) || 0;
  }
  
  // ========== Facebook & TikTok - use manual entries from daily_cashflow ==========
  const facebookAdsCost = existingFacebookCost;
  const tiktokAdsCost = existingTiktokCost;

  // Calculate TOTAL expenses including all new fields
  const totalExpenses = googleAdsCost + facebookAdsCost + tiktokAdsCost + finalShippingCost + materialsCost + creditCardFees + vat + employeeCost + refundsAmount + expensesVatAmount + expensesNoVatAmount;
  const profit = calculateProfit(revenue, totalExpenses);
  const roi = calculateROI(profit, totalExpenses, revenue);

  const dailyData: any = {
    date,
    revenue,
    orders_count: stats.ordersCount,
    items_count: stats.itemsCount || 0,
    google_ads_cost: googleAdsCost,
    facebook_ads_cost: facebookAdsCost,
    tiktok_ads_cost: tiktokAdsCost,
    shipping_cost: finalShippingCost,
    materials_cost: materialsCost,
    credit_card_fees: creditCardFees,
    vat,
    // NEW columns
    employee_cost: employeeCost,
    refunds_amount: refundsAmount,
    expenses_vat_amount: expensesVatAmount,
    expenses_no_vat_amount: expensesNoVatAmount,
    // Recalculated totals
    total_expenses: totalExpenses,
    profit,
    roi,
    updated_at: new Date().toISOString(),
  };

  // Add business_id if provided
  if (businessId) {
    dailyData.business_id = businessId;
  }

  // Upsert to Supabase - check if record exists first
  console.log(`💾 Saving to Supabase: ${date} - Revenue: ${revenue} - BusinessId: ${businessId || 'none'}`);
  
  // First, check if there's an existing record with business_id
  let existingRecord = null;
  
  if (businessId) {
    const { data: withBusinessId } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('id')
      .eq('date', date)
      .eq('business_id', businessId)
      .single();
    
    existingRecord = withBusinessId;
  }
  
  // If no record with business_id, check for record without business_id (legacy)
  if (!existingRecord) {
    const { data: withoutBusinessId } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('id')
      .eq('date', date)
      .is('business_id', null)
      .single();
    
    existingRecord = withoutBusinessId;
  }
  
  let data, error;
  
  if (existingRecord) {
    // Update existing record by ID
    const result = await supabase
      .from(TABLES.DAILY_DATA)
      .update(dailyData)
      .eq('id', existingRecord.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Insert new record
    const result = await supabase
      .from(TABLES.DAILY_DATA)
      .insert(dailyData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

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
}
