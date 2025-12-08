const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  // Get table info using Postgres system tables
  const { data, error } = await supabase.rpc('get_table_columns', {});
  
  if (error) {
    console.log('RPC not available, trying direct query...');
    
    // Fallback: check each table manually
    const tables = [
      'daily_cashflow',
      'order_item_costs', 
      'expenses_vat',
      'expenses_no_vat',
      'customer_refunds',
      'employees',
      'products',
      'product_costs',
      'businesses',
      'business_settings'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else if (data && data[0]) {
        const columns = Object.keys(data[0]);
        console.log(`\n📊 ${table} (${columns.length} columns):`);
        console.log(`   ${columns.join(', ')}`);
      } else {
        // Table exists but empty - get from a different way
        const { data: emptyData } = await supabase.from(table).select('*').limit(0);
        console.log(`\n📊 ${table}: (empty table, can't determine columns)`);
      }
    }
    return;
  }
  
  console.log('Schema:', data);
}

checkSchema().catch(console.error);
