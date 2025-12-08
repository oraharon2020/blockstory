require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get items WITH cost
  const { data: withCost } = await supabase
    .from('order_item_costs')
    .select('order_date, product_name, quantity, item_cost')
    .eq('business_id', '01294f31-38fa-4bd5-86fd-266d076ec57e')
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-31')
    .gt('item_cost', 0)
    .order('order_date');
  
  // Get items WITHOUT cost (cost = 0 or null)
  const { data: noCost } = await supabase
    .from('order_item_costs')
    .select('order_date, product_name, quantity, item_cost')
    .eq('business_id', '01294f31-38fa-4bd5-86fd-266d076ec57e')
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-31')
    .or('item_cost.eq.0,item_cost.is.null')
    .order('order_date');
  
  let totalWithCost = 0;
  let totalNoCost = 0;
  
  console.log('=== מוצרים עם עלות מוגדרת ===');
  console.log('תאריך      | מוצר                      | כמות | עלות');
  console.log('-----------|---------------------------|------|-------');
  (withCost || []).forEach(i => {
    const qty = i.quantity || 1;
    totalWithCost += qty;
    console.log(i.order_date + ' | ' + (i.product_name || '').substring(0,25).padEnd(25) + ' | ' + qty + '    | ' + i.item_cost);
  });
  console.log('סה"כ מוצרים עם עלות: ' + totalWithCost);
  
  console.log('\n=== מוצרים ללא עלות (0 או ריק) ===');
  (noCost || []).forEach(i => {
    const qty = i.quantity || 1;
    totalNoCost += qty;
    console.log(i.order_date + ' | ' + (i.product_name || '').substring(0,25).padEnd(25) + ' | ' + qty);
  });
  console.log('סה"כ מוצרים ללא עלות: ' + totalNoCost);
  
  console.log('\n=== סיכום ===');
  console.log('מוצרים עם עלות: ' + totalWithCost);
  console.log('מוצרים ללא עלות: ' + totalNoCost);
  console.log('סה"כ בטבלה: ' + (totalWithCost + totalNoCost));
}
check();
