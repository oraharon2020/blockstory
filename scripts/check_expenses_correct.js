require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function check() {
  // Get ALL expenses for December using expense_date
  console.log('=== כל ההוצאות בדצמבר 2025 (עם מע"מ) ===');
  const { data: expVat, error: vatErr } = await supabase
    .from('expenses_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31')
    .order('expense_date', { ascending: true });
  
  if (vatErr) {
    console.log('Error:', vatErr.message);
  }
  
  let totalExpVat = 0;
  let totalVatAmount = 0;
  if (expVat && expVat.length > 0) {
    expVat.forEach(e => {
      const amt = parseFloat(e.amount || 0);
      const vat = parseFloat(e.vat_amount || 0);
      totalExpVat += amt;
      totalVatAmount += vat;
      console.log('  ' + e.expense_date + ' - ' + e.description + ': ₪' + amt.toFixed(2) + ' (מע"מ: ₪' + vat.toFixed(2) + ')');
    });
    console.log('\nסה"כ הוצאות: ₪' + totalExpVat.toFixed(2));
    console.log('סה"כ מע"מ: ₪' + totalVatAmount.toFixed(2));
  } else {
    console.log('אין הוצאות');
  }
  
  console.log('\n=== כל ההוצאות בדצמבר 2025 (ללא מע"מ) ===');
  const { data: expNoVat, error: noVatErr } = await supabase
    .from('expenses_no_vat')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31')
    .order('expense_date', { ascending: true });
  
  if (noVatErr) {
    console.log('Error:', noVatErr.message);
  }
  
  let totalExpNoVat = 0;
  if (expNoVat && expNoVat.length > 0) {
    expNoVat.forEach(e => {
      const amt = parseFloat(e.amount || 0);
      totalExpNoVat += amt;
      console.log('  ' + e.expense_date + ' - ' + e.description + ': ₪' + amt.toFixed(2));
    });
    console.log('\nסה"כ: ₪' + totalExpNoVat.toFixed(2));
  } else {
    console.log('אין הוצאות');
  }
  
  // Get employees with actual salary field name
  console.log('\n=== עובדים - כל השדות ===');
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId);
  
  if (empErr) {
    console.log('Error:', empErr.message);
  }
  
  if (employees && employees.length > 0) {
    // Show all fields for first employee
    console.log('שדות בטבלה:', Object.keys(employees[0]).join(', '));
    console.log('');
    
    let totalSalaries = 0;
    employees.forEach(e => {
      // Check different possible field names
      const salary = parseFloat(e.monthly_salary || e.salary || e.monthly_cost || 0);
      totalSalaries += salary;
      console.log('  ' + e.name + ': ₪' + salary + '/חודש');
    });
    console.log('\nסה"כ משכורות: ₪' + totalSalaries.toFixed(2) + '/חודש');
  } else {
    console.log('אין עובדים');
  }
  
  // Summary
  console.log('\n========== סיכום דצמבר 2025 ==========');
  console.log('הוצאות עם מע"מ: ₪' + totalExpVat.toFixed(2));
  console.log('מע"מ על הוצאות: ₪' + totalVatAmount.toFixed(2));
  console.log('הוצאות ללא מע"מ: ₪' + totalExpNoVat.toFixed(2));
  console.log('סה"כ הוצאות: ₪' + (totalExpVat + totalExpNoVat).toFixed(2));
  
  const daysInDec = 31;
  console.log('\n--- בפריסה ליום ---');
  console.log('הוצאות ליום: ₪' + ((totalExpVat + totalExpNoVat) / daysInDec).toFixed(2));
  console.log('מע"מ הוצאות ליום: ₪' + (totalVatAmount / daysInDec).toFixed(2));
}

check();
