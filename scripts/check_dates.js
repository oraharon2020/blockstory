require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function check() {
  // Check daily_cashflow for Dec 2025
  const { data: decData, error: decError } = await supabase
    .from('daily_cashflow')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', '2025-12-01')
    .lte('date', '2025-12-31')
    .order('date', { ascending: true });
  
  console.log('=== DAILY_CASHFLOW December 2025 ===');
  if (decError) {
    console.log('Error:', decError.message);
  } else if (!decData || decData.length === 0) {
    console.log('אין נתונים בדצמבר 2025');
  } else {
    console.log('נמצאו ' + decData.length + ' רשומות:');
    decData.forEach(d => {
      console.log(d.date + ': ' + (d.orders_count || 0) + ' הזמנות, revenue=' + (d.total_revenue || 0));
    });
  }
  
  // Check what dates exist
  const { data: allDates, error: allError } = await supabase
    .from('daily_cashflow')
    .select('date, orders_count, total_revenue')
    .eq('business_id', businessId)
    .order('date', { ascending: false })
    .limit(15);
  
  console.log('\n=== 15 תאריכים אחרונים בדאטהבייס ===');
  if (allError) {
    console.log('Error:', allError.message);
  } else if (!allDates || allDates.length === 0) {
    console.log('אין נתונים בכלל לעסק הזה');
    
    // Check if data exists without business_id
    const { data: noBusinessData } = await supabase
      .from('daily_cashflow')
      .select('date, business_id')
      .order('date', { ascending: false })
      .limit(10);
    
    console.log('\n=== נתונים בכל העסקים ===');
    if (noBusinessData && noBusinessData.length > 0) {
      noBusinessData.forEach(d => console.log(d.date + ' (business: ' + (d.business_id || 'NULL') + ')'));
    } else {
      console.log('אין נתונים בכלל בטבלה');
    }
  } else {
    allDates.forEach(d => {
      console.log(d.date + ': ' + (d.orders_count || 0) + ' הזמנות, revenue=' + (d.total_revenue || 0));
    });
  }
  
  // Check WooCommerce orders directly
  console.log('\n=== בדיקת הזמנות מ-WooCommerce ===');
  const { data: orderCosts, error: orderError } = await supabase
    .from('order_item_costs')
    .select('order_date, order_id')
    .eq('business_id', businessId)
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-31');
  
  if (orderError) {
    console.log('Error:', orderError.message);
  } else if (!orderCosts || orderCosts.length === 0) {
    console.log('אין הזמנות בדצמבר 2025');
    
    // Check last orders
    const { data: lastOrders } = await supabase
      .from('order_item_costs')
      .select('order_date, order_id')
      .eq('business_id', businessId)
      .order('order_date', { ascending: false })
      .limit(5);
    
    if (lastOrders && lastOrders.length > 0) {
      console.log('הזמנות אחרונות:');
      lastOrders.forEach(o => console.log(o.order_date + ' - Order #' + o.order_id));
    }
  } else {
    const uniqueDates = [...new Set(orderCosts.map(o => o.order_date))];
    console.log('נמצאו הזמנות ב-' + uniqueDates.length + ' תאריכים שונים בדצמבר');
    uniqueDates.sort().forEach(d => {
      const count = orderCosts.filter(o => o.order_date === d).length;
      console.log(d + ': ' + count + ' פריטים');
    });
  }
}

check();
