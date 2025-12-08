require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const businessId = '01294f31-38fa-4bd5-86fd-266d076ec57e';

async function verifyFrontendCalculation() {
  console.log('========== אימות חישוב כמו ב-Frontend (1.12.2025) ==========\n');
  
  const vatRate = 17; // Default VAT rate
  const daysInDec = 31;
  
  // 1. Get daily_cashflow base data
  const { data: daily } = await supabase
    .from('daily_cashflow')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', '2025-12-01')
    .single();
  
  // 2. Get materials cost from order_item_costs
  const { data: orderCosts } = await supabase
    .from('order_item_costs')
    .select('item_cost, quantity')
    .eq('business_id', businessId)
    .eq('order_date', '2025-12-01');
  
  const materialsCost = (orderCosts || []).reduce((sum, item) => {
    return sum + (parseFloat(item.item_cost || 0) * parseInt(item.quantity || 1));
  }, 0);
  
  // 3. Get all expenses for December
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
  
  const totalVatExpenses = (expVat || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalVatAmount = (expVat || []).reduce((sum, e) => sum + parseFloat(e.vat_amount || 0), 0);
  const totalNoVatExpenses = (expNoVat || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  // 4. Get employees
  const { data: employees } = await supabase
    .from('employees')
    .select('salary')
    .eq('business_id', businessId);
  
  const totalSalaries = (employees || []).reduce((sum, e) => sum + parseFloat(e.salary || 0), 0);
  const dailyEmpCost = totalSalaries / daysInDec;
  
  // 5. Get refunds for December
  const { data: allRefunds } = await supabase
    .from('customer_refunds')
    .select('amount')
    .eq('business_id', businessId)
    .gte('refund_date', '2025-12-01')
    .lte('refund_date', '2025-12-31');
  
  const totalRefunds = (allRefunds || []).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  // Daily spread amounts
  const dailyVatExpense = totalVatExpenses / daysInDec;
  const dailyVatAmountExp = totalVatAmount / daysInDec;
  const dailyNoVatExpense = totalNoVatExpenses / daysInDec;
  const dailyRefund = totalRefunds / daysInDec;
  
  console.log('=== נתוני בסיס מ-daily_cashflow ===');
  console.log('פדיון: ₪' + daily.revenue);
  console.log('גוגל אדס: ₪' + daily.google_ads_cost);
  console.log('פייסבוק אדס: ₪' + daily.facebook_ads_cost);
  console.log('טיקטוק אדס: ₪' + (daily.tiktok_ads_cost || 0));
  console.log('משלוחים: ₪' + daily.shipping_cost);
  console.log('עמלת אשראי: ₪' + daily.credit_card_fees);
  
  console.log('\n=== חומרים מ-order_item_costs ===');
  console.log('עלות חומרים מחושבת: ₪' + materialsCost.toFixed(2));
  console.log('עלות חומרים שמורה: ₪' + daily.materials_cost);
  
  console.log('\n=== הוצאות פרוסות (חודשי / 31) ===');
  console.log('הוצאות עם מע"מ ליום: ₪' + dailyVatExpense.toFixed(2));
  console.log('מע"מ הוצאות ליום: ₪' + dailyVatAmountExp.toFixed(2));
  console.log('הוצאות ללא מע"מ ליום: ₪' + dailyNoVatExpense.toFixed(2));
  console.log('משכורות ליום: ₪' + dailyEmpCost.toFixed(2));
  console.log('זיכויים ליום: ₪' + dailyRefund.toFixed(2));
  
  // Calculate VAT like the frontend
  const revenueVat = daily.revenue * (vatRate / 100);
  const shippingCost = daily.shipping_cost || 0;
  const shippingVat = shippingCost * (vatRate / (100 + vatRate));
  const materialsVat = materialsCost * (vatRate / (100 + vatRate));
  const totalDeductibleVat = dailyVatAmountExp + shippingVat + materialsVat;
  const netVat = Math.max(0, revenueVat - totalDeductibleVat);
  
  console.log('\n=== חישוב מע"מ ===');
  console.log('מע"מ על פדיון (' + vatRate + '%): ₪' + revenueVat.toFixed(2));
  console.log('מע"מ ניכוי משלוחים: ₪' + shippingVat.toFixed(2));
  console.log('מע"מ ניכוי חומרים: ₪' + materialsVat.toFixed(2));
  console.log('מע"מ ניכוי הוצאות: ₪' + dailyVatAmountExp.toFixed(2));
  console.log('סה"כ מע"מ לניכוי: ₪' + totalDeductibleVat.toFixed(2));
  console.log('מע"מ נטו לתשלום: ₪' + netVat.toFixed(2));
  
  // Total expenses calculation (like frontend)
  const totalExpenses = 
    (daily.google_ads_cost || 0) +
    (daily.facebook_ads_cost || 0) +
    (daily.tiktok_ads_cost || 0) +
    shippingCost +
    materialsCost +
    (daily.credit_card_fees || 0) +
    netVat +
    dailyVatExpense +
    dailyNoVatExpense +
    dailyEmpCost +
    dailyRefund;
  
  const profit = daily.revenue - totalExpenses;
  const roi = daily.revenue > 0 ? ((profit / daily.revenue) * 100) : 0;
  
  console.log('\n=== חישוב סופי (כמו Frontend) ===');
  console.log('גוגל: ₪' + (daily.google_ads_cost || 0));
  console.log('פייסבוק: ₪' + (daily.facebook_ads_cost || 0));
  console.log('טיקטוק: ₪' + (daily.tiktok_ads_cost || 0));
  console.log('משלוחים: ₪' + shippingCost.toFixed(2));
  console.log('חומרים: ₪' + materialsCost.toFixed(2));
  console.log('עמלת אשראי: ₪' + (daily.credit_card_fees || 0));
  console.log('מע"מ נטו: ₪' + netVat.toFixed(2));
  console.log('הוצאות עם מע"מ (פרוס): ₪' + dailyVatExpense.toFixed(2));
  console.log('הוצאות ללא מע"מ (פרוס): ₪' + dailyNoVatExpense.toFixed(2));
  console.log('משכורות (פרוס): ₪' + dailyEmpCost.toFixed(2));
  console.log('זיכויים (פרוס): ₪' + dailyRefund.toFixed(2));
  console.log('------------------------');
  console.log('סה"כ הוצאות: ₪' + totalExpenses.toFixed(2));
  console.log('רווח: ₪' + profit.toFixed(2));
  console.log('ROI: ' + roi.toFixed(2) + '%');
  
  console.log('\n========== השוואה ==========');
  console.log('מה שנשמר בדאטהבייס:');
  console.log('  סה"כ הוצאות: ₪' + daily.total_expenses);
  console.log('  רווח: ₪' + daily.profit);
  console.log('  ROI: ' + daily.roi + '%');
  console.log('\nמה שצריך להיות מוצג (עם פריסה):');
  console.log('  סה"כ הוצאות: ₪' + totalExpenses.toFixed(2));
  console.log('  רווח: ₪' + profit.toFixed(2));
  console.log('  ROI: ' + roi.toFixed(2) + '%');
}

verifyFrontendCalculation();
