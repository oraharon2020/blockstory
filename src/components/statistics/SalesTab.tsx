/**
 * SalesTab Component
 * 
 * טאב מכירות - Funnel, נטישת עגלה, המרות
 * עם אפשרות השוואה בין תקופות
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowDown,
  CheckCircle
} from 'lucide-react';
import ComparisonSelector from './ComparisonSelector';
import ComparisonMetric from './ComparisonMetric';

interface RealDataInfo {
  source: string;
  purchases: number;
  revenue: number;
  ga4Purchases: number;
  discrepancy: number;
}

interface SalesData {
  funnel: { step: string; users: number; dropoff: number }[];
  cartAbandonment: number;
  avgOrderValue: number;
  conversionRate: number;
  purchasesBySource: { source: string; purchases: number; revenue: number }[];
  realData?: RealDataInfo;
}

interface SalesTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

// Helper function to calculate comparison period
const getComparisonDates = (
  startDate: string, 
  endDate: string, 
  type: 'previous' | 'custom' | 'year'
): { start: string; end: string } => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (type === 'previous') {
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() - 1);
    const newStart = new Date(newEnd);
    newStart.setDate(newStart.getDate() - daysDiff);
    return {
      start: newStart.toISOString().split('T')[0],
      end: newEnd.toISOString().split('T')[0],
    };
  } else if (type === 'year') {
    const newStart = new Date(start);
    newStart.setFullYear(newStart.getFullYear() - 1);
    const newEnd = new Date(end);
    newEnd.setFullYear(newEnd.getFullYear() - 1);
    return {
      start: newStart.toISOString().split('T')[0],
      end: newEnd.toISOString().split('T')[0],
    };
  }
  return { start: startDate, end: endDate };
};

export default function SalesTab({ businessId, startDate, endDate }: SalesTabProps) {
  const [data, setData] = useState<SalesData | null>(null);
  const [comparisonData, setComparisonData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonType, setComparisonType] = useState<'previous' | 'custom' | 'year'>('previous');
  const [customCompareStart, setCustomCompareStart] = useState('');
  const [customCompareEnd, setCustomCompareEnd] = useState('');

  const fetchData = async (fetchStartDate: string, fetchEndDate: string, isComparison = false) => {
    if (isComparison) {
      setComparisonLoading(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
    try {
      const params = new URLSearchParams({
        businessId,
        startDate: fetchStartDate,
        endDate: fetchEndDate,
      });
      
      const res = await fetch(`/api/analytics/sales?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch sales data');
      }
      
      if (isComparison) {
        setComparisonData(json);
      } else {
        setData(json);
      }
    } catch (err: any) {
      if (!isComparison) {
        setError(err.message);
      }
    } finally {
      if (isComparison) {
        setComparisonLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch main data
  useEffect(() => {
    if (businessId && startDate && endDate) {
      fetchData(startDate, endDate);
    }
  }, [businessId, startDate, endDate]);

  // Fetch comparison data when enabled
  useEffect(() => {
    if (comparisonEnabled && businessId) {
      let dates;
      if (comparisonType === 'custom' && customCompareStart && customCompareEnd) {
        dates = { start: customCompareStart, end: customCompareEnd };
      } else if (comparisonType !== 'custom') {
        dates = getComparisonDates(startDate, endDate, comparisonType);
      } else {
        return;
      }
      fetchData(dates.start, dates.end, true);
    } else {
      setComparisonData(null);
    }
  }, [comparisonEnabled, comparisonType, customCompareStart, customCompareEnd, startDate, endDate, businessId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentPeriodLabel = useMemo(() => {
    const start = new Date(startDate).toLocaleDateString('he-IL');
    const end = new Date(endDate).toLocaleDateString('he-IL');
    return `${start} - ${end}`;
  }, [startDate, endDate]);

  // Calculate change percentage helper
  const getChangePercent = (current: number, previous: number | undefined): number | null => {
    if (previous === undefined || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 mb-3">{error}</p>
        <button 
          onClick={() => fetchData(startDate, endDate)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* כותרת עם בקרות */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח מכירות</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <ComparisonSelector
            enabled={comparisonEnabled}
            onToggle={setComparisonEnabled}
            comparisonType={comparisonType}
            onTypeChange={setComparisonType}
            customStartDate={customCompareStart}
            customEndDate={customCompareEnd}
            onCustomDateChange={(start, end) => {
              setCustomCompareStart(start);
              setCustomCompareEnd(end);
            }}
            currentPeriodLabel={currentPeriodLabel}
          />
          <button
            onClick={() => {
              fetchData(startDate, endDate);
              if (comparisonEnabled) {
                const dates = comparisonType === 'custom' 
                  ? { start: customCompareStart, end: customCompareEnd }
                  : getComparisonDates(startDate, endDate, comparisonType);
                fetchData(dates.start, dates.end, true);
              }
            }}
            disabled={loading || comparisonLoading}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading || comparisonLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comparison Loading Indicator */}
      {comparisonLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>טוען נתוני השוואה...</span>
        </div>
      )}

      {/* כרטיסי סיכום עם השוואה */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* שיעור המרה */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-700 font-medium">שיעור המרה</span>
          </div>
          <ComparisonMetric
            label=""
            current={data.conversionRate}
            previous={comparisonEnabled ? comparisonData?.conversionRate : undefined}
            format="percent"
            showComparison={comparisonEnabled}
            size="lg"
          />
        </div>

        {/* ממוצע הזמנה */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-700 font-medium">ממוצע להזמנה</span>
          </div>
          <ComparisonMetric
            label=""
            current={data.avgOrderValue}
            previous={comparisonEnabled ? comparisonData?.avgOrderValue : undefined}
            format="currency"
            showComparison={comparisonEnabled}
            size="lg"
          />
        </div>

        {/* נטישת עגלה */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange-700 font-medium">נטישת עגלה</span>
          </div>
          <ComparisonMetric
            label=""
            current={data.cartAbandonment}
            previous={comparisonEnabled ? comparisonData?.cartAbandonment : undefined}
            format="percent"
            showComparison={comparisonEnabled}
            size="lg"
          />
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            משפך המרה (Funnel)
          </h4>
          {data.realData && (
            <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>נתוני רכישות אמיתיים מהחנות</span>
            </div>
          )}
        </div>
        
        {/* Funnel Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.funnel[0]?.users.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500">צפו במוצרים</div>
          </div>
          <div className="text-center border-x border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {data.funnel[data.funnel.length - 1]?.users.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500">רכשו</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.funnel[0]?.users > 0 
                ? ((data.funnel[data.funnel.length - 1]?.users / data.funnel[0]?.users) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">יחס המרה כולל</div>
          </div>
        </div>
        
        <div className="space-y-1">
          {data.funnel.map((step, idx) => {
            const maxUsers = data.funnel[0]?.users || 1;
            const percentage = maxUsers > 0 ? (step.users / maxUsers) * 100 : 0;
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-green-500'];
            const comparisonStep = comparisonData?.funnel.find(s => s.step === step.step);
            const changePercent = comparisonEnabled && comparisonStep
              ? getChangePercent(step.users, comparisonStep.users)
              : null;
            
            // Calculate step-to-step conversion rate
            const prevStepUsers = idx > 0 ? data.funnel[idx - 1]?.users : step.users;
            const stepConversion = prevStepUsers > 0 ? ((step.users / prevStepUsers) * 100).toFixed(0) : 100;
            
            // Determine if this step has real WooCommerce data
            const isRealData = step.step === 'רכישה' && data.realData;
            
            return (
              <div key={step.step}>
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  {/* Step Number */}
                  <div className={`w-10 h-10 rounded-full ${colors[idx]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {idx + 1}
                  </div>
                  
                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{step.step}</span>
                      {isRealData && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">WooCommerce</span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${colors[idx]} transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-left flex items-center gap-3 shrink-0">
                    {/* Users Count */}
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-lg">{step.users.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{percentage.toFixed(0)}% מהצפיות</div>
                    </div>
                    
                    {/* Step Conversion */}
                    {idx > 0 && (
                      <div className="text-right border-r border-gray-200 pr-3">
                        {step.dropoff > 0 ? (
                          <div className="text-red-500 text-sm font-medium">
                            ↓ {step.dropoff}%
                            <div className="text-[10px] text-red-400">נטשו</div>
                          </div>
                        ) : (
                          <div className="text-green-500 text-sm font-medium">
                            {stepConversion}%
                            <div className="text-[10px] text-green-400">המשיכו</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Comparison */}
                    {changePercent !== null && (
                      <div className={`text-xs flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(changePercent).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Arrow between steps */}
                {idx < data.funnel.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Funnel Insights */}
        {data.funnel.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2 text-sm">💡 תובנות</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              {(() => {
                const viewToCart = data.funnel[0]?.users > 0 
                  ? ((data.funnel[1]?.users || 0) / data.funnel[0].users * 100) 
                  : 0;
                const cartToCheckout = (data.funnel[1]?.users || 0) > 0 
                  ? ((data.funnel[2]?.users || 0) / data.funnel[1].users * 100) 
                  : 0;
                const checkoutToPurchase = (data.funnel[2]?.users || 0) > 0 
                  ? ((data.funnel[3]?.users || 0) / data.funnel[2].users * 100) 
                  : 0;
                
                const insights = [];
                
                if (viewToCart < 3) {
                  insights.push('• רק ' + viewToCart.toFixed(1) + '% מהצופים מוסיפים לעגלה - שקול לשפר את דפי המוצר');
                }
                if (cartToCheckout < 40) {
                  insights.push('• ' + (100 - cartToCheckout).toFixed(0) + '% נוטשים בעגלה - שקול להוסיף תזכורות או הנחות');
                }
                if (checkoutToPurchase < 50 && checkoutToPurchase > 0) {
                  insights.push('• ' + (100 - checkoutToPurchase).toFixed(0) + '% נוטשים בתשלום - בדוק את תהליך התשלום');
                }
                if (checkoutToPurchase >= 100) {
                  insights.push('• יש רכישות שלא עברו דרך checkout רגיל (כמו העברה בנקאית)');
                }
                if (insights.length === 0) {
                  insights.push('• המשפך נראה תקין! המשך לעקוב אחרי השינויים');
                }
                
                return insights.map((insight, i) => <li key={i}>{insight}</li>);
              })()}
            </ul>
          </div>
        )}
        
        {/* Data Source Explanation */}
        {data.realData && data.realData.discrepancy !== 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h5 className="font-medium text-amber-800 mb-2 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              הבדל בין מקורות הנתונים
            </h5>
            <div className="text-sm text-amber-700 space-y-2">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                <span>Google Analytics דיווח:</span>
                <span className="font-bold">{data.realData.ga4Purchases} רכישות</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                <span>WooCommerce בפועל:</span>
                <span className="font-bold text-green-700">{data.realData.purchases} רכישות</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-amber-100 rounded">
                <span>פער:</span>
                <span className="font-bold">{Math.abs(data.realData.discrepancy)} רכישות ({data.realData.discrepancy > 0 ? 'חסרות' : 'עודף'} ב-GA4)</span>
              </div>
              <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                💡 <strong>למה יש פער?</strong> Google Analytics לא קולט ~20-30% מהמבקרים בגלל:
                חוסמי פרסומות (AdBlocker), גלישה פרטית (Incognito), או דפדפנים עם הגנת פרטיות (Brave, Firefox).
                <br />
                <strong>המספר מ-WooCommerce הוא המדויק!</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* רכישות לפי מקור */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          רכישות לפי מקור תנועה
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">מקור</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">רכישות</th>
                {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">הכנסות</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">% מסה"כ</th>
              </tr>
            </thead>
            <tbody>
              {data.purchasesBySource.map((source, idx) => {
                const totalRevenue = data.purchasesBySource.reduce((sum, s) => sum + s.revenue, 0);
                const percentage = totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0;
                const comparisonSource = comparisonData?.purchasesBySource.find(s => s.source === source.source);
                const changePercent = comparisonEnabled && comparisonSource
                  ? getChangePercent(source.purchases, comparisonSource.purchases)
                  : null;
                
                return (
                  <tr key={source.source} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-800">{source.source}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{source.purchases}</td>
                    {comparisonEnabled && (
                      <td className="py-3 px-4">
                        {changePercent !== null ? (
                          <span className={`text-sm flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(changePercent).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(source.revenue)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
