require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function check() {
  // Get ALL expenses for December (not just Dec 1)
  console.log('=== כל ההוצאות בדצמבר 2025 (עם מע"מ) ===');
  const { data: expVat } = await supabase
    .from('expenses_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', '2025-12-01')
    .lte('date', '2025-12-31');
  
  let totalExpVat = 0;
  if (expVat && expVat.length > 0) {
    expVat.forEach(e => {
      console.log('  ' + e.date + ' - ' + e.name + ': ₪' + e.amount);
      totalExpVat += parseFloat(e.amount || 0);
    });
    console.log('סה"כ: ₪' + totalExpVat.toFixed(2));
  } else {
    console.log('אין הוצאות');
  }
  
  console.log('\n=== כל ההוצאות בדצמבר 2025 (ללא מע"מ) ===');
  const { data: expNoVat } = await supabase
    .from('expenses_no_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('date', '2025-12-01')
    .lte('date', '2025-12-31');
  
  let totalExpNoVat = 0;
  if (expNoVat && expNoVat.length > 0) {
    expNoVat.forEach(e => {
      console.log('  ' + e.date + ' - ' + e.name + ': ₪' + e.amount);
      totalExpNoVat += parseFloat(e.amount || 0);
    });
    console.log('סה"כ: ₪' + totalExpNoVat.toFixed(2));
  } else {
    console.log('אין הוצאות');
  }
  
  // Get employees with salaries
  console.log('\n=== עובדים ומשכורות ===');
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId);
  
  let totalSalaries = 0;
  if (employees && employees.length > 0) {
    employees.forEach(e => {
      const salary = parseFloat(e.monthly_salary || 0);
      totalSalaries += salary;
      console.log('  ' + e.name + ': ₪' + salary + '/חודש');
    });
    console.log('סה"כ משכורות: ₪' + totalSalaries.toFixed(2) + '/חודש');
    console.log('ליום (חלקי 30): ₪' + (totalSalaries / 30).toFixed(2));
  } else {
    console.log('אין עובדים');
  }
  
  // Get business settings to check spread mode
  console.log('\n=== הגדרות עסק ===');
  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();
  
  if (settings) {
    console.log('מצב פריסת הוצאות: ' + (settings.expenses_spread_mode || 'לא מוגדר'));
    console.log('מצב מע"מ: ' + (settings.vat_mode || 'לא מוגדר'));
    console.log('מצב עמלת אשראי: ' + (settings.credit_fee_mode || 'לא מוגדר'));
  } else {
    console.log('אין הגדרות');
  }
  
  // Calculate what Dec 1 should look like with spread
  console.log('\n=== חישוב מחדש ליום 1.12 עם פריסה ===');
  const daysInDec = 31;
  const dailyExpVat = totalExpVat / daysInDec;
  const dailyExpNoVat = totalExpNoVat / daysInDec;
  const dailySalaries = totalSalaries / 30; // Usually 30 work days
  
  console.log('הוצאות עם מע"מ ליום: ₪' + dailyExpVat.toFixed(2));
  console.log('הוצאות ללא מע"מ ליום: ₪' + dailyExpNoVat.toFixed(2));
  console.log('משכורות ליום: ₪' + dailySalaries.toFixed(2));
  console.log('סה"כ הוצאות פרוסות ליום: ₪' + (dailyExpVat + dailyExpNoVat + dailySalaries).toFixed(2));
  
  // Get all refunds for December
  console.log('\n=== כל הזיכויים בדצמבר 2025 ===');
  const { data: refunds } = await supabase
    .from('customer_refunds')
    .select('*')
    .eq('business_id', businessId)
    .gte('refund_date', '2025-12-01')
    .lte('refund_date', '2025-12-31');
  
  let totalRefunds = 0;
  if (refunds && refunds.length > 0) {
    refunds.forEach(r => {
      const amount = parseFloat(r.amount || 0);
      totalRefunds += amount;
      console.log('  ' + r.refund_date + ' - Order #' + (r.order_id || 'N/A') + ': ₪' + amount);
    });
    console.log('סה"כ זיכויים: ₪' + totalRefunds.toFixed(2));
  } else {
    console.log('אין זיכויים');
  }
}

check();
