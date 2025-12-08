const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkItemsCount() {
  const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';
  
  // Check current items_count in daily_cashflow
  const { data, error } = await supabase
    .from('daily_cashflow')
    .select('date, items_count, orders_count')
    .eq('business_id', businessId)
    .gte('date', '2025-12-01')
    .order('date');
    
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('📊 Daily cashflow items_count:');
  data.forEach(d => {
    console.log(`  ${d.date}: ${d.items_count || 0} מוצרים, ${d.orders_count} הזמנות`);
  });
}

checkItemsCount();
