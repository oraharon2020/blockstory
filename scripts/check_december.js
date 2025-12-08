const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gvpobzhluzmsdcgrytmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQxNzk2NywiZXhwIjoyMDYwOTkzOTY3fQ.4lJRXPtrPKJLLsqPKcHvBNOOj9E-hMdaqzH5PNIX8Zc'
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function run() {
  console.log('='.repeat(70));
  console.log('בדיקת נתונים חודשיים - דצמבר 2025');
  console.log('='.repeat(70));

  // All expenses VAT December
  const { data: expVat } = await supabase
    .from('expenses_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31')
    .order('expense_date');
  
  console.log('\n💸 EXPENSES_VAT (הוצאות מוכרות דצמבר):');
  if (expVat && expVat.length > 0) {
    let total = 0;
    expVat.forEach(e => {
      total += parseFloat(e.amount || 0);
      console.log(`  ${e.expense_date}: ${e.description} - ${e.amount} ש"ח`);
    });
    console.log('  ---');
    console.log(`  סה"כ: ${total} ש"ח`);
  } else {
    console.log('  אין הוצאות');
  }

  // All expenses No VAT December
  const { data: expNoVat } = await supabase
    .from('expenses_no_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31')
    .order('expense_date');
  
  console.log('\n🌍 EXPENSES_NO_VAT (הוצאות חו"ל דצמבר):');
  if (expNoVat && expNoVat.length > 0) {
    let total = 0;
    expNoVat.forEach(e => {
      total += parseFloat(e.amount || 0);
      console.log(`  ${e.expense_date}: ${e.description} - ${e.amount} ש"ח`);
    });
    console.log('  ---');
    console.log(`  סה"כ: ${total} ש"ח`);
  } else {
    console.log('  אין הוצאות');
  }

  // Refunds December
  const { data: refunds } = await supabase
    .from('customer_refunds')
    .select('*')
    .eq('business_id', businessId)
    .gte('refund_date', '2025-12-01')
    .lte('refund_date', '2025-12-31')
    .order('refund_date');
  
  console.log('\n↩️ CUSTOMER_REFUNDS (זיכויים דצמבר):');
  if (refunds && refunds.length > 0) {
    let total = 0;
    refunds.forEach(r => {
      total += parseFloat(r.amount || 0);
      console.log(`  ${r.refund_date}: ${r.description || 'זיכוי'} - ${r.amount} ש"ח`);
    });
    console.log('  ---');
    console.log(`  סה"כ: ${total} ש"ח`);
  } else {
    console.log('  אין זיכויים');
  }

  // Employees December
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId)
    .eq('month', 12)
    .eq('year', 2025);
  
  console.log('\n👥 EMPLOYEES (עובדים דצמבר 2025):');
  if (employees && employees.length > 0) {
    let total = 0;
    employees.forEach(e => {
      total += parseFloat(e.salary || 0);
      console.log(`  ${e.name}${e.role ? ' (' + e.role + ')' : ''}: ${e.salary} ש"ח/חודש`);
    });
    console.log('  ---');
    console.log(`  סה"כ חודשי: ${total} ש"ח`);
    console.log(`  עלות יומית: ${(total/31).toFixed(2)} ש"ח`);
  } else {
    console.log('  אין עובדים רשומים');
  }

  // Order Items December (to see what sold)
  const { data: orderItems } = await supabase
    .from('order_item_costs')
    .select('*')
    .eq('business_id', businessId)
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-31')
    .order('order_date');
  
  console.log('\n📦 ORDER_ITEM_COSTS (מכירות דצמבר):');
  if (orderItems && orderItems.length > 0) {
    let totalCost = 0, totalPrice = 0, totalQty = 0;
    const byDate = {};
    orderItems.forEach(i => {
      const cost = parseFloat(i.item_cost || 0) * (i.quantity || 1);
      const price = parseFloat(i.item_price || 0) * (i.quantity || 1);
      totalCost += cost;
      totalPrice += price;
      totalQty += (i.quantity || 1);
      if (!byDate[i.order_date]) byDate[i.order_date] = { items: 0, cost: 0, price: 0 };
      byDate[i.order_date].items += (i.quantity || 1);
      byDate[i.order_date].cost += cost;
      byDate[i.order_date].price += price;
    });
    Object.keys(byDate).sort().forEach(date => {
      const d = byDate[date];
      console.log(`  ${date}: ${d.items} פריטים, עלות=${d.cost.toFixed(0)}, מכירה=${d.price.toFixed(0)}`);
    });
    console.log('  ---');
    console.log(`  סה"כ פריטים: ${totalQty}`);
    console.log(`  סה"כ עלות חומרים: ${totalCost.toFixed(0)} ש"ח`);
    console.log(`  סה"כ מכירות: ${totalPrice.toFixed(0)} ש"ח`);
    console.log(`  רווח גולמי: ${(totalPrice - totalCost).toFixed(0)} ש"ח`);
  } else {
    console.log('  אין מכירות');
  }

  // Daily data December (from daily_cashflow)
  const { data: dailyData } = await supabase
    .from('daily_cashflow')
    .select('date, revenue, orders_count, google_ads_cost, facebook_ads_cost, tiktok_ads_cost, materials_cost, shipping_cost, profit')
    .eq('business_id', businessId)
    .gte('date', '2025-12-01')
    .lte('date', '2025-12-31')
    .order('date');
  
  console.log('\n📅 DAILY_CASHFLOW (סיכום יומי דצמבר):');
  if (dailyData && dailyData.length > 0) {
    let totals = { revenue: 0, orders: 0, google: 0, facebook: 0, tiktok: 0, materials: 0, shipping: 0 };
    dailyData.forEach(d => {
      totals.revenue += parseFloat(d.revenue || 0);
      totals.orders += parseInt(d.orders_count || 0);
      totals.google += parseFloat(d.google_ads_cost || 0);
      totals.facebook += parseFloat(d.facebook_ads_cost || 0);
      totals.tiktok += parseFloat(d.tiktok_ads_cost || 0);
      totals.materials += parseFloat(d.materials_cost || 0);
      totals.shipping += parseFloat(d.shipping_cost || 0);
      console.log(`  ${d.date}: הכנסות=${d.revenue}, הזמנות=${d.orders_count}, גוגל=${d.google_ads_cost||0}, פייסבוק=${d.facebook_ads_cost||0}`);
    });
    console.log('  ---');
    console.log(`  סה"כ הכנסות: ${totals.revenue.toFixed(0)} ש"ח`);
    console.log(`  סה"כ הזמנות: ${totals.orders}`);
    console.log(`  סה"כ גוגל: ${totals.google.toFixed(0)} ש"ח`);
    console.log(`  סה"כ פייסבוק: ${totals.facebook.toFixed(0)} ש"ח`);
    console.log(`  סה"כ טיקטוק: ${totals.tiktok.toFixed(0)} ש"ח`);
    console.log(`  סה"כ חומרים: ${totals.materials.toFixed(0)} ש"ח`);
    console.log(`  סה"כ משלוח: ${totals.shipping.toFixed(0)} ש"ח`);
  } else {
    console.log('  אין נתונים יומיים');
  }

  console.log('\n' + '='.repeat(70));
}

run().catch(console.error);
