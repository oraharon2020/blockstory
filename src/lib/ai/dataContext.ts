// AI Data Context Service
// Gives AI FULL unrestricted access to query the database

import { supabase } from '@/lib/supabase';
import { BusinessMetrics, DailyMetrics, AIContext, TopProduct } from './types';

// Get ALL business data - NO LIMITS
export async function getFullBusinessData(businessId: string): Promise<any> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Current month range
  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
  
  // Last month range
  const startOfLastMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endOfLastMonth = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Last 3 months for more context
  const threeMonthsAgo = new Date(year, month - 3, 1).toISOString().split('T')[0];

  // Fetch EVERYTHING - NO LIMITS
  const [
    businessInfo,
    settings,
    // All cashflow data (3 months)
    allCashflow,
    // All expenses
    allExpensesVat,
    allExpensesNoVat,
    // All refunds
    allRefunds,
    // All employees
    allEmployees,
    // ALL products - no limit
    allProducts,
    // ALL order item costs (what was sold) - no limit
    allOrderItemCosts,
    // Product costs (for cost calculations)
    productCosts,
  ] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.from('business_settings').select('*').eq('business_id', businessId).single(),
    
    // Get 3 months of cashflow
    supabase.from('daily_cashflow').select('*').eq('business_id', businessId)
      .gte('date', threeMonthsAgo).order('date'),
    
    // Get all expenses (3 months)
    supabase.from('expenses_vat').select('*').eq('business_id', businessId)
      .gte('expense_date', threeMonthsAgo).order('expense_date'),
    supabase.from('expenses_no_vat').select('*').eq('business_id', businessId)
      .gte('expense_date', threeMonthsAgo).order('expense_date'),
    
    // Get all refunds (3 months)
    supabase.from('customer_refunds').select('*').eq('business_id', businessId)
      .gte('refund_date', threeMonthsAgo).order('refund_date'),
    
    // Get ALL employees
    supabase.from('employees').select('*').eq('business_id', businessId),
    
    // Get ALL products - NO LIMIT
    supabase.from('products').select('*').eq('business_id', businessId),
    
    // Get ALL order item costs (sales data) - 3 months - NO LIMIT
    supabase.from('order_item_costs').select('*').eq('business_id', businessId)
      .gte('order_date', threeMonthsAgo).order('order_date'),
    
    // Get product costs
    supabase.from('product_costs').select('*').eq('business_id', businessId),
  ]);

  return {
    business: businessInfo.data,
    settings: settings.data,
    cashflow: allCashflow.data || [],
    expensesVat: allExpensesVat.data || [],
    expensesNoVat: allExpensesNoVat.data || [],
    refunds: allRefunds.data || [],
    employees: allEmployees.data || [],
    products: allProducts.data || [],
    orderItemCosts: allOrderItemCosts.data || [],
    productCosts: productCosts.data || [],
    today: today.toISOString().split('T')[0],
    periods: {
      currentMonth: { start: startOfMonth, end: endOfMonth },
      lastMonth: { start: startOfLastMonth, end: endOfLastMonth },
      threeMonthsAgo,
    }
  };
}

// Format ALL data for AI - RAW JSON, NO LIMITS
export function formatFullDataForPrompt(data: any): string {
  const { business, settings, cashflow, expensesVat, expensesNoVat, refunds, 
          employees, products, orderItemCosts, productCosts, today, periods } = data;

  // Send EVERYTHING as JSON - the AI is smart enough to understand it
  return `
📆 תאריך נוכחי: ${today}
🏢 עסק: ${business?.name || 'לא ידוע'}

═══════════════════════════════════════════════════════════════
🗄️ כל הנתונים בדאטהבייס (3 חודשים אחרונים) - JSON גולמי
═══════════════════════════════════════════════════════════════

📊 DAILY_CASHFLOW (תזרים יומי - ${cashflow?.length || 0} רשומות):
${JSON.stringify(cashflow, null, 2)}

📦 ORDER_ITEM_COSTS (פריטים שנמכרו - ${orderItemCosts?.length || 0} רשומות):
${JSON.stringify(orderItemCosts, null, 2)}

💸 EXPENSES_VAT (הוצאות מוכרות - ${expensesVat?.length || 0} רשומות):
${JSON.stringify(expensesVat, null, 2)}

💸 EXPENSES_NO_VAT (הוצאות חו"ל - ${expensesNoVat?.length || 0} רשומות):
${JSON.stringify(expensesNoVat, null, 2)}

↩️ CUSTOMER_REFUNDS (זיכויים - ${refunds?.length || 0} רשומות):
${JSON.stringify(refunds, null, 2)}

👥 EMPLOYEES (עובדים - ${employees?.length || 0} רשומות):
${JSON.stringify(employees, null, 2)}

🛍️ PRODUCTS (מוצרים - ${products?.length || 0} רשומות):
${JSON.stringify(products, null, 2)}

💰 PRODUCT_COSTS (עלויות מוצרים - ${productCosts?.length || 0} רשומות):
${JSON.stringify(productCosts, null, 2)}

⚙️ BUSINESS_SETTINGS:
${JSON.stringify(settings, null, 2)}

═══════════════════════════════════════════════════════════════
📋 מבנה הנתונים (שמות עמודות מדויקים!):

- daily_cashflow: date, revenue (הכנסות), orders_count, items_count (מוצרים שנמכרו), google_ads_cost, facebook_ads_cost, tiktok_ads_cost, materials_cost (עלות חומרים), shipping_cost (משלוח), vat (מע"מ), credit_card_fees (עמלות), total_expenses (סה"כ הוצאות), profit (רווח), roi

- order_item_costs: order_id, order_date, product_name, quantity (כמות), item_cost (עלות המוצר!), adjusted_cost, shipping_cost, supplier_name, variation_key
  ⚠️ אין item_price! להכנסות השתמש ב-daily_cashflow.revenue

- expenses_vat: expense_date, description, amount (סכום), vat_amount (סכום המע"מ), category, supplier_name, payment_method

- expenses_no_vat: expense_date, description, amount, category, supplier_name, payment_method

- customer_refunds: refund_date, amount, customer_name, reason, description, order_id

- employees: name, role, salary (=משכורת חודשית!), month, year, notes
  ⚠️ השתמש ב-salary ולא monthly_cost!

- product_costs: product_id, product_name, sku, unit_cost (=עלות יחידה), supplier_name

- business_settings: vat_rate, credit_card_rate, credit_fee_mode, expenses_spread_mode, shipping_cost, valid_order_statuses
  ⚠️ שמות בsnake_case!

═══════════════════════════════════════════════════════════════
`.trim();
}

// Legacy exports for backward compatibility  
export async function getBusinessContext(
  businessId: string,
  timeframe: string = 'this_month'
): Promise<AIContext> {
  const data = await getFullBusinessData(businessId);
  
  const dailyData: DailyMetrics[] = (data.cashflow || []).map((d: any) => ({
    date: d.date,
    revenue: d.revenue || 0,
    orders: d.orders_count || 0,
    expenses: (d.google_ads_cost || 0) + (d.facebook_ads_cost || 0) + (d.tiktok_ads_cost || 0),
    profit: d.profit || 0,
    adsCost: (d.google_ads_cost || 0) + (d.facebook_ads_cost || 0) + (d.tiktok_ads_cost || 0)
  }));

  const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);
  
  return {
    businessName: data.business?.name || 'העסק שלי',
    metrics: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalExpenses: 0,
      expensesVat: 0,
      expensesNoVat: 0,
      employeeCosts: 0,
      adsCosts: { google: 0, facebook: 0, tiktok: 0, total: 0 },
      shippingCosts: 0,
      materialsCosts: 0,
      creditCardFees: 0,
      customerRefunds: 0,
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0,
      vatCollected: 0,
      vatDeductible: 0,
      vatPayable: 0,
      period: {
        type: 'month',
        startDate: data.periods?.currentMonth?.start || '',
        endDate: data.periods?.currentMonth?.end || '',
        daysCount: dailyData.length
      }
    },
    dailyData,
    insights: []
  };
}

export function formatMetricsForPrompt(context: AIContext): string {
  return '';
}
