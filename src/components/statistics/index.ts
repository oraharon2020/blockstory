/**
 * Statistics Components Index
 * 
 * מודול מרכזי לייצוא כל קומפוננטות הסטטיסטיקה
 * 
 * שימוש:
 * import { StatCard, RevenueChart, PeriodSelector } from '@/components/statistics';
 */

export { default as StatCard, TrendIndicator, StatCardSkeleton } from './StatCard';
export { default as RevenueChart } from './RevenueChart';
export { default as ExpensesBreakdownChart } from './ExpensesBreakdownChart';
export { default as OrdersChart } from './OrdersChart';
export { default as HighlightsCard } from './HighlightsCard';
export { default as PeriodSelector } from './PeriodSelector';

// Types
export interface StatisticsData {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalExpenses: number;
  averageOrderValue: number;
  averageDailyRevenue: number;
  averageDailyProfit: number;
  averageRoi: number;
  profitMargin: number;
  
  expensesBreakdown: {
    googleAds: number;
    facebookAds: number;
    shipping: number;
    materials: number;
    creditCardFees: number;
    vat: number;
  };
  
  trends: {
    revenue: number;
    profit: number;
    orders: number;
    roi: number;
  };
  
  dailyData: {
    date: string;
    revenue: number;
    profit: number;
    orders: number;
    expenses: number;
  }[];
  
  bestDay: { date: string; revenue: number } | null;
  worstDay: { date: string; revenue: number } | null;
  mostProfitableDay: { date: string; profit: number } | null;
  
  daysWithData: number;
  periodStart: string;
  periodEnd: string;
}
