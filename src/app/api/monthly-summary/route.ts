import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This endpoint calculates the monthly summary by calling the same APIs as the UI
// So the AI gets the exact same data

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    // Calculate date range (same as UI)
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Call the same APIs as the UI
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const [cashflowRes, costsRes, expensesRes, employeesRes, refundsRes, settingsRes] = await Promise.all([
      fetch(`${baseUrl}/api/cashflow?businessId=${businessId}&start=${startDate}&end=${endDate}`),
      fetch(`${baseUrl}/api/daily-costs?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`),
      fetch(`${baseUrl}/api/expenses?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`),
      fetch(`${baseUrl}/api/employees?businessId=${businessId}&month=${month}&year=${year}`),
      fetch(`${baseUrl}/api/refunds?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`),
      fetch(`${baseUrl}/api/business-settings?businessId=${businessId}`),
    ]);

    const cashflowJson = await cashflowRes.json();
    const costsJson = await costsRes.json();
    const expensesJson = await expensesRes.json();
    const employeesJson = await employeesRes.json();
    const refundsJson = await refundsRes.json();
    const settingsJson = await settingsRes.json();

    // Get settings
    const vatRate = parseFloat(settingsJson.data?.vatRate) || 18;
    const expensesSpreadMode = settingsJson.data?.expensesSpreadMode || 'exact';
    
    // Get daily employee cost and total products
    const dailyEmpCost = employeesJson.dailyCost || 0;
    const totalProductsSold = costsJson.totalQuantity || 0;
    
    // Get costs and shipping by date
    const costsByDate: Record<string, number> = costsJson.costsByDate || {};
    const shippingByDate: Record<string, number> = costsJson.shippingByDate || {};
    const refundsByDate: Record<string, number> = refundsJson.refundsByDate || {};

    // Process expenses by date and calculate totals for spread mode
    const expensesByDate: Record<string, { vat: number; vatAmount: number; noVat: number }> = {};
    let totalVatExpensesRaw = 0;
    let totalVatAmountRaw = 0;
    let totalNoVatExpensesRaw = 0;
    
    (expensesJson.vatExpenses || []).forEach((exp: any) => {
      const date = exp.expense_date;
      const amount = exp.amount || 0;
      const vatAmount = exp.vat_amount || 0;
      if (!expensesByDate[date]) {
        expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
      }
      expensesByDate[date].vat += amount;
      expensesByDate[date].vatAmount += vatAmount;
      totalVatExpensesRaw += amount;
      totalVatAmountRaw += vatAmount;
    });
    (expensesJson.noVatExpenses || []).forEach((exp: any) => {
      const date = exp.expense_date;
      const amount = exp.amount || 0;
      if (!expensesByDate[date]) {
        expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
      }
      expensesByDate[date].noVat += amount;
      totalNoVatExpensesRaw += amount;
    });
    
    // Calculate total refunds for spread mode
    let totalRefundsRaw = 0;
    Object.values(refundsByDate).forEach((amount: any) => {
      totalRefundsRaw += amount;
    });

    // Generate all dates for the month
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    
    // Calculate daily spread amounts
    const daysCount = dates.length;
    const dailyVatExpense = totalVatExpensesRaw / daysCount;
    const dailyVatAmount = totalVatAmountRaw / daysCount;
    const dailyNoVatExpense = totalNoVatExpensesRaw / daysCount;
    const dailyRefund = totalRefundsRaw / daysCount;

    // Create data map from cashflow
    const dataByDate: Record<string, any> = {};
    (cashflowJson.data || []).forEach((row: any) => {
      dataByDate[row.date] = row;
    });

    // Calculate totals (same logic as UI's CashflowTableMonthly.tsx)
    let totalRevenue = 0;
    let totalOrdersCount = 0;
    let totalItemsCount = 0;
    let totalGoogleAds = 0;
    let totalFacebookAds = 0;
    let totalTiktokAds = 0;
    let totalShippingCost = 0;
    let totalMaterialsCost = 0;
    let totalCreditCardFees = 0;
    let totalVat = 0;
    let totalExpensesVat = 0;
    let totalExpensesNoVat = 0;
    let totalEmployeeCost = 0;
    let totalRefunds = 0;
    let totalExpenses = 0;
    let totalProfit = 0;

    dates.forEach(dateStr => {
      const existing = dataByDate[dateStr];
      const materialsCost = costsByDate[dateStr] || 0;
      const manualShipping = shippingByDate[dateStr] || 0;
      
      // Use spread or exact based on setting (same as UI)
      const dayExpenses = expensesSpreadMode === 'spread'
        ? { vat: dailyVatExpense, vatAmount: dailyVatAmount, noVat: dailyNoVatExpense }
        : (expensesByDate[dateStr] || { vat: 0, vatAmount: 0, noVat: 0 });
      const dayRefunds = expensesSpreadMode === 'spread'
        ? dailyRefund
        : (refundsByDate[dateStr] || 0);

      if (existing) {
        // Use the stored values from the UI (which calculates and saves them)
        // This ensures we get the same numbers as the UI displays
        totalRevenue += existing.revenue || 0;
        totalOrdersCount += existing.ordersCount || 0;
        totalItemsCount += existing.itemsCount || 0;
        totalGoogleAds += existing.googleAdsCost || 0;
        totalFacebookAds += existing.facebookAdsCost || 0;
        totalTiktokAds += existing.tiktokAdsCost || 0;
        totalShippingCost += existing.shippingCost || 0;
        totalMaterialsCost += existing.materialsCost || 0;
        totalCreditCardFees += existing.creditCardFees || 0;
        totalVat += existing.vat || 0;
        totalExpensesVat += existing.expensesVat || 0;
        totalExpensesNoVat += existing.expensesNoVat || 0;
        totalEmployeeCost += existing.employeeCost || 0;
        totalRefunds += existing.customerRefunds || 0;
        totalExpenses += existing.totalExpenses || 0;
        totalProfit += existing.profit || 0;
      } else {
        // Days without orders - employee cost and spread expenses still apply
        const dayTotalExpenses = materialsCost + dayExpenses.vat + dayExpenses.noVat + dailyEmpCost + dayRefunds;
        totalMaterialsCost += materialsCost;
        totalExpensesVat += dayExpenses.vat;
        totalExpensesNoVat += dayExpenses.noVat;
        totalEmployeeCost += dailyEmpCost;
        totalRefunds += dayRefunds;
        totalExpenses += dayTotalExpenses;
        totalProfit -= dayTotalExpenses;
      }
    });

    // Use totalProductsSold from costs API if itemsCount is 0
    if (totalItemsCount === 0 && totalProductsSold > 0) {
      totalItemsCount = totalProductsSold;
    }

    const profitPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      month,
      year,
      dateRange: { startDate, endDate },
      summary: {
        revenue: Math.round(totalRevenue * 100) / 100,
        ordersCount: totalOrdersCount,
        itemsCount: totalItemsCount,
        profit: Math.round(totalProfit * 100) / 100,
        profitPercent: Math.round(profitPercent * 10) / 10,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
      },
      breakdown: {
        googleAds: Math.round(totalGoogleAds * 100) / 100,
        facebookAds: Math.round(totalFacebookAds * 100) / 100,
        tiktokAds: Math.round(totalTiktokAds * 100) / 100,
        shippingCost: Math.round(totalShippingCost * 100) / 100,
        materialsCost: Math.round(totalMaterialsCost * 100) / 100,
        creditCardFees: Math.round(totalCreditCardFees * 100) / 100,
        vat: Math.round(totalVat * 100) / 100,
        expensesVat: Math.round(totalExpensesVat * 100) / 100,
        expensesNoVat: Math.round(totalExpensesNoVat * 100) / 100,
        employeeCost: Math.round(totalEmployeeCost * 100) / 100,
        refunds: Math.round(totalRefunds * 100) / 100,
      }
    });

  } catch (error) {
    console.error('Monthly summary error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate monthly summary' },
      { status: 500 }
    );
  }
}
