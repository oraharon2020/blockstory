import { DailyData } from '@/types';

const VAT_RATE = 0.17; // 17% מע"מ
const CREDIT_CARD_FEE_RATE = 0.025; // 2.5% עמלת אשראי
const DEFAULT_MATERIALS_RATE = 0.30; // 30% עלות חומרי גלם

export function calculateVAT(revenue: number): number {
  return revenue * VAT_RATE;
}

export function calculateCreditCardFees(revenue: number): number {
  return revenue * CREDIT_CARD_FEE_RATE;
}

export function calculateMaterialsCost(revenue: number, rate: number = DEFAULT_MATERIALS_RATE): number {
  return revenue * rate;
}

export function calculateTotalExpenses(data: Partial<DailyData>): number {
  return (
    (data.googleAdsCost || 0) +
    (data.facebookAdsCost || 0) +
    (data.shippingCost || 0) +
    (data.materialsCost || 0) +
    (data.creditCardFees || 0) +
    (data.vat || 0)
  );
}

export function calculateProfit(revenue: number, totalExpenses: number): number {
  return revenue - totalExpenses;
}

export function calculateROI(profit: number, totalExpenses: number): number {
  if (totalExpenses === 0) return 0;
  return (profit / totalExpenses) * 100;
}

export function calculateDailyMetrics(
  revenue: number,
  googleAdsCost: number = 0,
  facebookAdsCost: number = 0,
  shippingCost: number = 0,
  materialsCostOverride?: number,
  materialsRate: number = DEFAULT_MATERIALS_RATE
): DailyData {
  const materialsCost = materialsCostOverride !== undefined 
    ? materialsCostOverride 
    : calculateMaterialsCost(revenue, materialsRate);
  const creditCardFees = calculateCreditCardFees(revenue);
  const vat = calculateVAT(revenue);

  const totalExpenses = googleAdsCost + facebookAdsCost + shippingCost + materialsCost + creditCardFees + vat;
  const profit = calculateProfit(revenue, totalExpenses);
  const roi = calculateROI(profit, totalExpenses);

  return {
    date: new Date().toISOString().split('T')[0],
    revenue,
    ordersCount: 0,
    googleAdsCost,
    facebookAdsCost,
    shippingCost,
    materialsCost,
    creditCardFees,
    vat,
    totalExpenses,
    profit,
    roi,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getDaysInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    days.push(start.toISOString().split('T')[0]);
    start.setDate(start.getDate() + 1);
  }
  
  return days;
}
