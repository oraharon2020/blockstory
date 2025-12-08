require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function check() {
  // Get Dec 1 data with all columns
  const { data, error } = await supabase
    .from('daily_cashflow')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01')
    .single();
  
  console.log('=== DAILY_CASHFLOW 2025-12-01 - כל השדות ===');
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
  
  // Get order_item_costs for Dec 1
  console.log('\n=== ORDER_ITEM_COSTS 2025-12-01 ===');
  const { data: items, error: itemsError } = await supabase
    .from('order_item_costs')
    .select('*')
    .eq('business_id', businessId)
    .eq('order_date', '2025-12-01');
  
  if (itemsError) {
    console.log('Error:', itemsError.message);
  } else {
    console.log('נמצאו ' + items.length + ' פריטים');
    let totalRevenue = 0;
    let totalCost = 0;
    items.forEach(item => {
      totalRevenue += parseFloat(item.item_total || 0);
      totalCost += parseFloat(item.item_cost || 0) * parseInt(item.quantity || 1);
      console.log('Order #' + item.order_id + ': ' + item.product_name + ' x' + item.quantity + ' - Revenue: ' + item.item_total + ', Cost: ' + item.item_cost);
    });
    console.log('\nסה"כ פדיון: ' + totalRevenue.toFixed(2));
    console.log('סה"כ עלויות: ' + totalCost.toFixed(2));
    console.log('רווח גולמי: ' + (totalRevenue - totalCost).toFixed(2));
  }
  
  // Get expenses for Dec 1
  console.log('\n=== EXPENSES 2025-12-01 ===');
  const { data: expVat, error: expVatError } = await supabase
    .from('expenses_vat')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01');
  
  const { data: expNoVat, error: expNoVatError } = await supabase
    .from('expenses_no_vat')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01');
  
  console.log('הוצאות עם מע"מ:', (expVat || []).length);
  if (expVat && expVat.length > 0) {
    expVat.forEach(e => console.log('  - ' + e.name + ': ' + e.amount));
  }
  
  console.log('הוצאות ללא מע"מ:', (expNoVat || []).length);
  if (expNoVat && expNoVat.length > 0) {
    expNoVat.forEach(e => console.log('  - ' + e.name + ': ' + e.amount));
  }
  
  // Get employees
  console.log('\n=== EMPLOYEES ===');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId);
  
  if (employees && employees.length > 0) {
    employees.forEach(e => console.log('  - ' + e.name + ': ' + e.monthly_salary + '/חודש'));
  } else {
    console.log('אין עובדים');
  }
  
  // Get refunds for Dec 1
  console.log('\n=== REFUNDS 2025-12-01 ===');
  const { data: refunds, error: refundsError } = await supabase
    .from('customer_refunds')
    .select('*')
    .eq('business_id', businessId)
    .eq('refund_date', '2025-12-01');
  
  if (refunds && refunds.length > 0) {
    refunds.forEach(r => console.log('  - Order #' + r.order_id + ': ' + r.amount));
  } else {
    console.log('אין זיכויים');
  }
}

check();
