require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data } = await supabase
    .from('order_item_costs')
    .select('order_date, product_name, quantity')
    .eq('business_id', '01294f31-38fa-4bd5-86fd-266d076ec57e')
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-31')
    .order('order_date');
  
  let total = 0;
  console.log('תאריך      | מוצר                      | כמות');
  console.log('-----------|---------------------------|------');
  (data || []).forEach(i => {
    const qty = i.quantity || 1;
    total += qty;
    console.log(i.order_date + ' | ' + (i.product_name || '').substring(0,25).padEnd(25) + ' | ' + qty);
  });
  console.log('-----------|---------------------------|------');
  console.log('סה"כ מוצרים בדצמבר: ' + total);
}
check();
