require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function verify() {
  console.log('========== אימות חישובים ל-1 בדצמבר 2025 ==========\n');
  
  // Get daily_cashflow data for Dec 1
  const { data: daily } = await supabase
    .from('daily_cashflow')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01')
    .single();
  
  if (!daily) {
    console.log('אין נתונים ל-1.12!');
    return;
  }
  
  console.log('=== נתונים שמורים בדאטהבייס (daily_cashflow) ===');
  console.log('פדיון: ₪' + daily.revenue);
  console.log('הזמנות: ' + daily.orders_count);
  console.log('גוגל אדס: ₪' + daily.google_ads_cost);
  console.log('פייסבוק אדס: ₪' + daily.facebook_ads_cost);
  console.log('טיקטוק אדס: ₪' + daily.tiktok_ads_cost);
  console.log('משלוחים: ₪' + daily.shipping_cost);
  console.log('עלות חומרים: ₪' + daily.materials_cost);
  console.log('עמלת אשראי: ₪' + daily.credit_card_fees);
  console.log('מע"מ: ₪' + daily.vat);
  console.log('סה"כ הוצאות: ₪' + daily.total_expenses);
  console.log('רווח: ₪' + daily.profit);
  console.log('ROI: ' + daily.roi + '%');
  
  // Now calculate what it SHOULD be with spread expenses
  console.log('\n=== חישוב מחדש עם פריסת הוצאות ===');
  
  // Get all December expenses
  const { data: expVat } = await supabase
    .from('expenses_vat')
    .select('amount, vat_amount')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31');
  
  const { data: expNoVat } = await supabase
    .from('expenses_no_vat')
    .select('amount')
    .eq('business_id', businessId)
    .gte('expense_date', '2025-12-01')
    .lte('expense_date', '2025-12-31');
  
  const { data: employees } = await supabase
    .from('employees')
    .select('salary')
    .eq('business_id', businessId);
  
  const { data: refunds } = await supabase
    .from('customer_refunds')
    .select('amount')
    .eq('business_id', businessId)
    .eq('refund_date', '2025-12-01');
  
  // Calculate totals
  const totalExpVat = (expVat || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalVatOnExp = (expVat || []).reduce((sum, e) => sum + parseFloat(e.vat_amount || 0), 0);
  const totalExpNoVat = (expNoVat || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalSalaries = (employees || []).reduce((sum, e) => sum + parseFloat(e.salary || 0), 0);
  const totalRefunds = (refunds || []).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  const daysInDec = 31;
  const dailyExpenses = (totalExpVat + totalExpNoVat) / daysInDec;
  const dailySalaries = totalSalaries / daysInDec;
  const dailyVatOnExp = totalVatOnExp / daysInDec;
  
  console.log('הוצאות חודשיות סה"כ: ₪' + (totalExpVat + totalExpNoVat).toFixed(2));
  console.log('הוצאות ליום (פריסה): ₪' + dailyExpenses.toFixed(2));
  console.log('מע"מ הוצאות ליום: ₪' + dailyVatOnExp.toFixed(2));
  console.log('משכורות ליום: ₪' + dailySalaries.toFixed(2));
  console.log('זיכויים ביום: ₪' + totalRefunds.toFixed(2));
  
  // What the totals should be
  const revenue = parseFloat(daily.revenue);
  const googleAds = parseFloat(daily.google_ads_cost);
  const facebookAds = parseFloat(daily.facebook_ads_cost);
  const tiktokAds = parseFloat(daily.tiktok_ads_cost || 0);
  const shipping = parseFloat(daily.shipping_cost);
  const materials = parseFloat(daily.materials_cost);
  const creditFees = parseFloat(daily.credit_card_fees);
  
  // Calculate expected VAT on sales (17%)
  const vatOnSales = revenue * 0.17;
  
  console.log('\n=== חישוב צפוי ===');
  console.log('פדיון: ₪' + revenue.toFixed(2));
  console.log('מע"מ על מכירות (17%): ₪' + vatOnSales.toFixed(2));
  
  // Current expenses in daily_cashflow
  const currentExpenses = googleAds + facebookAds + tiktokAds + shipping + materials + creditFees;
  console.log('\nהוצאות יומיות קיימות:');
  console.log('  גוגל: ₪' + googleAds);
  console.log('  פייסבוק: ₪' + facebookAds);
  console.log('  משלוחים: ₪' + shipping);
  console.log('  חומרים: ₪' + materials);
  console.log('  עמלת אשראי: ₪' + creditFees);
  console.log('  סה"כ: ₪' + currentExpenses.toFixed(2));
  
  console.log('\n=== השוואה ===');
  console.log('מע"מ שמור: ₪' + daily.vat);
  console.log('מע"מ מכירות מחושב: ₪' + vatOnSales.toFixed(2));
  
  const expectedTotalExpenses = currentExpenses + dailyExpenses + dailySalaries + vatOnSales - dailyVatOnExp + totalRefunds;
  console.log('\nסה"כ הוצאות שמור: ₪' + daily.total_expenses);
  console.log('סה"כ הוצאות צפוי (עם פריסה): ₪' + expectedTotalExpenses.toFixed(2));
  
  const expectedProfit = revenue - expectedTotalExpenses;
  console.log('\nרווח שמור: ₪' + daily.profit);
  console.log('רווח צפוי: ₪' + expectedProfit.toFixed(2));
}

verify();
