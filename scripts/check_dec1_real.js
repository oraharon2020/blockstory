const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function check() {
  console.log('📊 בודק נתונים אמיתיים ליום 1.12.2025:\n');
  
  // daily_cashflow
  const { data: cashflow } = await supabase
    .from('daily_cashflow')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01')
    .single();
  
  console.log('=== DAILY_CASHFLOW ===');
  if (cashflow) {
    console.log(`  revenue: ${cashflow.revenue}`);
    console.log(`  orders_count: ${cashflow.orders_count}`);
    console.log(`  items_count: ${cashflow.items_count}`);
    console.log(`  profit: ${cashflow.profit}`);
    console.log(`  total_expenses: ${cashflow.total_expenses}`);
    console.log(`  google_ads_cost: ${cashflow.google_ads_cost}`);
    console.log(`  facebook_ads_cost: ${cashflow.facebook_ads_cost}`);
    console.log(`  tiktok_ads_cost: ${cashflow.tiktok_ads_cost}`);
    console.log(`  shipping_cost: ${cashflow.shipping_cost}`);
    console.log(`  materials_cost: ${cashflow.materials_cost}`);
    console.log(`  vat: ${cashflow.vat}`);
    console.log(`  credit_card_fees: ${cashflow.credit_card_fees}`);
  } else {
    console.log('  ❌ אין רשומה!');
  }
  
  // order_item_costs
  const { data: items } = await supabase
    .from('order_item_costs')
    .select('*')
    .eq('business_id', businessId)
    .eq('order_date', '2025-12-01');
  
  console.log(`\n=== ORDER_ITEM_COSTS (${items?.length || 0} פריטים) ===`);
  if (items?.length > 0) {
    let totalQty = 0;
    let totalCost = 0;
    items.forEach(item => {
      console.log(`  - ${item.product_name}: qty=${item.quantity}, cost=${item.item_cost}`);
      totalQty += item.quantity || 0;
      totalCost += (item.item_cost || 0) * (item.quantity || 1);
    });
    console.log(`  סה"כ כמות: ${totalQty}, סה"כ עלות: ${totalCost}`);
  }
  
  // expenses_vat
  const { data: expVat } = await supabase
    .from('expenses_vat')
    .select('*')
    .eq('business_id', businessId)
    .eq('expense_date', '2025-12-01');
  
  console.log(`\n=== EXPENSES_VAT (${expVat?.length || 0} הוצאות) ===`);
  expVat?.forEach(e => console.log(`  - ${e.description}: ${e.amount}₪`));
  
  // expenses_no_vat
  const { data: expNoVat } = await supabase
    .from('expenses_no_vat')
    .select('*')
    .eq('business_id', businessId)
    .eq('expense_date', '2025-12-01');
  
  console.log(`\n=== EXPENSES_NO_VAT (${expNoVat?.length || 0} הוצאות) ===`);
  expNoVat?.forEach(e => console.log(`  - ${e.description}: ${e.amount}₪`));
  
  // employees for December
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId);
  
  console.log(`\n=== EMPLOYEES (${employees?.length || 0} עובדים) ===`);
  employees?.forEach(e => console.log(`  - ${e.name}: ${e.salary}₪ (${e.month}/${e.year})`));
  
  // refunds
  const { data: refunds } = await supabase
    .from('customer_refunds')
    .select('*')
    .eq('business_id', businessId)
    .eq('refund_date', '2025-12-01');
  
  console.log(`\n=== CUSTOMER_REFUNDS (${refunds?.length || 0} זיכויים) ===`);
  refunds?.forEach(r => console.log(`  - ${r.customer_name}: ${r.amount}₪`));
}

check().catch(console.error);
