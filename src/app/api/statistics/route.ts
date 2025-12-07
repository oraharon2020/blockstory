import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase, TABLES } from '@/lib/supabase';

interface DailyCashflow {
  date: string;
  revenue: number;
  orders_count: number;
  profit: number;
  total_expenses: number;
  google_ads_cost: number;
  facebook_ads_cost: number;
  tiktok_ads_cost: number;
  shipping_cost: number;
  materials_cost: number;
  credit_card_fees: number;
  vat: number;
  roi: number;
}

interface StatisticsResponse {
  // Summary metrics
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalExpenses: number;
  averageOrderValue: number;
  averageDailyRevenue: number;
  averageDailyProfit: number;
  averageRoi: number;
  profitMargin: number;
  
  // Expenses breakdown
  expensesBreakdown: {
    googleAds: number;
    facebookAds: number;
    tiktokAds: number;
    shipping: number;
    materials: number;
    creditCardFees: number;
    vat: number;
  };
  
  // Trends (compare to previous period)
  trends: {
    revenue: number;
    profit: number;
    orders: number;
    roi: number;
  };
  
  // Daily data for charts
  dailyData: {
    date: string;
    revenue: number;
    profit: number;
    orders: number;
    expenses: number;
  }[];
  
  // Best/worst days
  bestDay: { date: string; revenue: number } | null;
  worstDay: { date: string; revenue: number } | null;
  mostProfitableDay: { date: string; profit: number } | null;
  
  // Period info
  daysWithData: number;
  periodStart: string;
  periodEnd: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'month'; // month, quarter, year, custom

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Calculate date range based on period
    let start: Date, end: Date;
    const now = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          end = now;
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          start = new Date(now.getFullYear(), quarterStart, 1);
          end = now;
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = now;
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
      }
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Fetch current period data
    const { data: currentData, error } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('*')
      .eq('business_id', businessId)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching statistics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const data = (currentData || []) as DailyCashflow[];

    // Calculate previous period for trends
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const { data: prevData } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('*')
      .eq('business_id', businessId)
      .gte('date', prevStart.toISOString().split('T')[0])
      .lte('date', prevEnd.toISOString().split('T')[0]);

    const previousData = (prevData || []) as DailyCashflow[];

    // Calculate statistics
    const stats = calculateStatistics(data, previousData, startStr, endStr);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error in statistics API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateStatistics(
  data: DailyCashflow[], 
  previousData: DailyCashflow[],
  periodStart: string,
  periodEnd: string
): StatisticsResponse {
  // Current period totals
  const totalRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const totalProfit = data.reduce((sum, d) => sum + (d.profit || 0), 0);
  const totalOrders = data.reduce((sum, d) => sum + (d.orders_count || 0), 0);
  const totalExpenses = data.reduce((sum, d) => sum + (d.total_expenses || 0), 0);
  
  // Expenses breakdown
  const expensesBreakdown = {
    googleAds: data.reduce((sum, d) => sum + (d.google_ads_cost || 0), 0),
    facebookAds: data.reduce((sum, d) => sum + (d.facebook_ads_cost || 0), 0),
    tiktokAds: data.reduce((sum, d) => sum + (d.tiktok_ads_cost || 0), 0),
    shipping: data.reduce((sum, d) => sum + (d.shipping_cost || 0), 0),
    materials: data.reduce((sum, d) => sum + (d.materials_cost || 0), 0),
    creditCardFees: data.reduce((sum, d) => sum + (d.credit_card_fees || 0), 0),
    vat: data.reduce((sum, d) => sum + (d.vat || 0), 0),
  };
  
  // Averages
  const daysWithData = data.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageDailyRevenue = daysWithData > 0 ? totalRevenue / daysWithData : 0;
  const averageDailyProfit = daysWithData > 0 ? totalProfit / daysWithData : 0;
  const totalAds = expensesBreakdown.googleAds + expensesBreakdown.facebookAds + expensesBreakdown.tiktokAds;
  // % רווח מההכנסות (רווח / הכנסות)
  const averageRoi = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : (totalProfit < 0 ? -100 : 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  // Previous period totals for trends
  const prevRevenue = previousData.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const prevProfit = previousData.reduce((sum, d) => sum + (d.profit || 0), 0);
  const prevOrders = previousData.reduce((sum, d) => sum + (d.orders_count || 0), 0);
  const prevRoi = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;
  
  // Calculate trends (percentage change)
  const trends = {
    revenue: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    profit: prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0,
    orders: prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0,
    roi: prevRoi > 0 ? ((averageRoi - prevRoi) / prevRoi) * 100 : 0,
  };
  
  // Daily data for charts
  const dailyData = data.map(d => ({
    date: d.date,
    revenue: d.revenue || 0,
    profit: d.profit || 0,
    orders: d.orders_count || 0,
    expenses: d.total_expenses || 0,
  }));
  
  // Best/worst days
  const sortedByRevenue = [...data].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const sortedByProfit = [...data].sort((a, b) => (b.profit || 0) - (a.profit || 0));
  
  const bestDay = sortedByRevenue.length > 0 
    ? { date: sortedByRevenue[0].date, revenue: sortedByRevenue[0].revenue || 0 }
    : null;
  const worstDay = sortedByRevenue.length > 0 
    ? { date: sortedByRevenue[sortedByRevenue.length - 1].date, revenue: sortedByRevenue[sortedByRevenue.length - 1].revenue || 0 }
    : null;
  const mostProfitableDay = sortedByProfit.length > 0 
    ? { date: sortedByProfit[0].date, profit: sortedByProfit[0].profit || 0 }
    : null;
  
  return {
    totalRevenue,
    totalProfit,
    totalOrders,
    totalExpenses,
    averageOrderValue,
    averageDailyRevenue,
    averageDailyProfit,
    averageRoi,
    profitMargin,
    expensesBreakdown,
    trends,
    dailyData,
    bestDay,
    worstDay,
    mostProfitableDay,
    daysWithData,
    periodStart,
    periodEnd,
  };
}
