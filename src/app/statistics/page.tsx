'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Percent, 
  Calculator,
  Wallet,
  Target,
  RefreshCw,
  AlertCircle,
  Store,
  Users,
  Package,
  Globe,
  Clock,
  Search
} from 'lucide-react';

// Import all statistics components
import {
  StatCard,
  RevenueChart,
  ExpensesBreakdownChart,
  OrdersChart,
  HighlightsCard,
  PeriodSelector,
  StatisticsData,
  ChannelPerformanceCard,
  TrafficTab,
  SalesTab,
  ProductsTab,
} from '@/components/statistics';
import GeographyTab from '@/components/statistics/GeographyTab';
import TimeAnalysisTab from '@/components/statistics/TimeAnalysisTab';
import SearchTermsTab from '@/components/statistics/SearchTermsTab';

// Tab types
type TabType = 'summary' | 'traffic' | 'sales' | 'channels' | 'products' | 'geography' | 'time' | 'search';

// Helper: Get max date (today or earlier) - GA can't query future dates
const getMaxEndDate = (endDate: string): string => {
  const today = new Date().toISOString().split('T')[0];
  return endDate > today ? today : endDate;
};

/**
 * StatisticsPage - דף סטטיסטיקות ראשי
 * 
 * מציג סיכום נתונים, גרפים ומטריקות עבור התקופה הנבחרת
 * כל הנתונים נטענים מ-API שמחשב מטבלת daily_cashflow
 */
export default function StatisticsPage() {
  const { currentBusiness, loading: authLoading } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [period, setPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch statistics data
  const fetchStatistics = useCallback(async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    setError(null);

    try {
      let url = `/api/statistics?businessId=${currentBusiness.id}&period=${period}`;
      
      if (period === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const stats = await res.json();
      setData(stats);
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, period, customStartDate, customEndDate]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Handle period change
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  // Handle custom date change
  const handleDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // No business selected
  if (!currentBusiness) {
    return (
      <div className="max-w-2xl mx-auto p-8" dir="rtl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">לא נבחרה חנות</h2>
          <p className="text-yellow-700">בחר חנות מהתפריט בראש הדף כדי לצפות בסטטיסטיקות</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">סטטיסטיקות</h1>
              <div className="flex items-center gap-2 text-gray-500">
                <Store className="w-4 h-4" />
                <span>{currentBusiness.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PeriodSelector
              value={period}
              onChange={handlePeriodChange}
              startDate={customStartDate}
              endDate={customEndDate}
              onDateChange={handleDateChange}
            />
            <button
              onClick={fetchStatistics}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-t pt-4 overflow-x-auto">
          {[
            { id: 'summary' as TabType, label: 'סיכום', icon: BarChart3 },
            { id: 'traffic' as TabType, label: 'תנועה', icon: Users },
            { id: 'sales' as TabType, label: 'מכירות', icon: ShoppingCart },
            { id: 'channels' as TabType, label: 'ערוצים', icon: Target },
            { id: 'products' as TabType, label: 'מוצרים', icon: Package },
            { id: 'geography' as TabType, label: 'גיאוגרפיה', icon: Globe },
            { id: 'time' as TabType, label: 'זמנים', icon: Clock },
            { id: 'search' as TabType, label: 'חיפושים', icon: Search },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && activeTab === 'summary' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchStatistics}
            className="mr-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* Summary Tab Content */}
      {activeTab === 'summary' && (
        <>
          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="סה״כ הכנסות"
              value={data?.totalRevenue || 0}
              trend={data?.trends.revenue}
              icon={DollarSign}
              color="blue"
              format="currency"
              loading={loading}
            />
        <StatCard
          title="סה״כ רווח"
          value={data?.totalProfit || 0}
          trend={data?.trends.profit}
          icon={TrendingUp}
          color="green"
          format="currency"
          loading={loading}
        />
        <StatCard
          title="מספר הזמנות"
          value={data?.totalOrders || 0}
          trend={data?.trends.orders}
          icon={ShoppingCart}
          color="purple"
          format="number"
          loading={loading}
        />
        <StatCard
          title="% רווח ממוצע"
          value={data?.averageRoi || 0}
          trend={data?.trends.roi}
          icon={Target}
          color="orange"
          format="percent"
          subtitle="רווח ÷ הכנסות"
          loading={loading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="ממוצע הזמנה"
          value={data?.averageOrderValue || 0}
          icon={Calculator}
          color="indigo"
          format="currency"
          loading={loading}
        />
        <StatCard
          title="הכנסה יומית ממוצעת"
          value={data?.averageDailyRevenue || 0}
          icon={Wallet}
          color="blue"
          format="currency"
          loading={loading}
        />
        <StatCard
          title="רווח יומי ממוצע"
          value={data?.averageDailyProfit || 0}
          icon={TrendingUp}
          color="green"
          format="currency"
          loading={loading}
        />
        <StatCard
          title="מרווח רווח"
          value={data?.profitMargin || 0}
          icon={Percent}
          color="pink"
          format="percent"
          subtitle="אחוז רווח מההכנסות"
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={data?.dailyData || []}
          loading={loading}
        />
        <ExpensesBreakdownChart
          data={data?.expensesBreakdown || {
            googleAds: 0,
            facebookAds: 0,
            tiktokAds: 0,
            shipping: 0,
            materials: 0,
            creditCardFees: 0,
            vat: 0,
            expensesVat: 0,
            expensesNoVat: 0,
            refunds: 0,
            employeeCost: 0,
          }}
          loading={loading}
        />
      </div>
        </>
      )}

      {/* Charts Row 2 */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrdersChart
            data={data?.dailyData || []}
            loading={loading}
          />
          <HighlightsCard
            bestDay={data?.bestDay || null}
            worstDay={data?.worstDay || null}
            mostProfitableDay={data?.mostProfitableDay || null}
            daysWithData={data?.daysWithData || 0}
            loading={loading}
          />
        </div>
      )}

      {/* Channel Performance - moved to channels tab */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 gap-6">
          <ChannelPerformanceCard
            businessId={currentBusiness.id}
            startDate={data?.periodStart || ''}
            endDate={data?.periodEnd || ''}
            loading={loading}
          />
        </div>
      )}

      {/* Traffic Tab */}
      {activeTab === 'traffic' && data?.periodStart && data?.periodEnd && (
        <TrafficTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && data?.periodStart && data?.periodEnd && (
        <SalesTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Products Tab */}
      {activeTab === 'products' && data?.periodStart && data?.periodEnd && (
        <ProductsTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Geography Tab */}
      {activeTab === 'geography' && data?.periodStart && data?.periodEnd && (
        <GeographyTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Time Analysis Tab */}
      {activeTab === 'time' && data?.periodStart && data?.periodEnd && (
        <TimeAnalysisTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Search Terms Tab */}
      {activeTab === 'search' && data?.periodStart && data?.periodEnd && (
        <SearchTermsTab
          businessId={currentBusiness.id}
          startDate={data.periodStart}
          endDate={getMaxEndDate(data.periodEnd)}
        />
      )}

      {/* Period Info */}
      {data && !loading && (
        <div className="text-center text-sm text-gray-500 py-4">
          נתונים מתאריך {new Date(data.periodStart).toLocaleDateString('he-IL')} עד {new Date(data.periodEnd).toLocaleDateString('he-IL')}
          {' · '}
          {data.daysWithData} ימים עם נתונים
        </div>
      )}
    </div>
  );
}
