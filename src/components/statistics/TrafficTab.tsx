/**
 * TrafficTab Component
 * 
 * טאב תנועה - מציג נתוני משתמשים, מכשירים ודפים נצפים
 * עם אפשרות השוואה בין תקופות
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  TrendingDown,
  TrendingUp,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  GitCompare
} from 'lucide-react';
import ComparisonSelector from './ComparisonSelector';
import ComparisonMetric from './ComparisonMetric';

interface TrafficData {
  userTypes: { type: string; users: number; sessions: number }[];
  devices: { device: string; users: number; sessions: number; percentage: number }[];
  topPages: { page: string; views: number; avgTime: number }[];
  avgSessionDuration: number;
  bounceRate: number;
}

interface TrafficTabProps {
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

export default function TrafficTab({ businessId, startDate, endDate }: TrafficTabProps) {
  const [data, setData] = useState<TrafficData | null>(null);
  const [comparisonData, setComparisonData] = useState<TrafficData | null>(null);
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
      
      const res = await fetch(`/api/analytics/traffic?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch traffic data');
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'מחשב': return Monitor;
      case 'נייד': return Smartphone;
      case 'טאבלט': return Tablet;
      default: return Monitor;
    }
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

  const totalUsers = data.userTypes.reduce((sum, t) => sum + t.users, 0);
  const comparisonTotalUsers = comparisonData?.userTypes.reduce((sum, t) => sum + t.users, 0);

  return (
    <div className="space-y-6">
      {/* כותרת עם בקרות */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח תנועה</h3>
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
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading || comparisonLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* כרטיסי סיכום עם השוואה */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* סה"כ משתמשים */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-700 font-medium">סה"כ משתמשים</span>
          </div>
          <ComparisonMetric
            label=""
            current={totalUsers}
            previous={comparisonEnabled ? comparisonTotalUsers : undefined}
            format="number"
            showComparison={comparisonEnabled}
            size="lg"
          />
        </div>

        {/* זמן ממוצע */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-700 font-medium">זמן ממוצע באתר</span>
          </div>
          <ComparisonMetric
            label=""
            current={data.avgSessionDuration}
            previous={comparisonEnabled ? comparisonData?.avgSessionDuration : undefined}
            format="duration"
            showComparison={comparisonEnabled}
            size="lg"
          />
        </div>

        {/* שיעור נטישה */}
        <div 
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 relative group cursor-help"
          title="אחוז המבקרים שעזבו את האתר אחרי צפייה בדף אחד בלבד, ללא אינטראקציה נוספת"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange-700 font-medium">שיעור נטישה</span>
          </div>
          <ComparisonMetric
            label=""
            current={data.bounceRate}
            previous={comparisonEnabled ? comparisonData?.bounceRate : undefined}
            format="percent"
            showComparison={comparisonEnabled}
            size="lg"
          />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            אחוז המבקרים שעזבו אחרי דף אחד בלבד
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>

      {/* Comparison Loading Indicator */}
      {comparisonLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>טוען נתוני השוואה...</span>
        </div>
      )}

      {/* שורה עם משתמשים ומכשירים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* משתמשים חדשים vs חוזרים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            משתמשים חדשים וחוזרים
          </h4>
          <div className="space-y-4">
            {data.userTypes.map((type) => {
              const percentage = totalUsers > 0 ? Math.round((type.users / totalUsers) * 100) : 0;
              const isNew = type.type === 'חדשים';
              const comparisonType_ = comparisonData?.userTypes.find(t => t.type === type.type);
              const changePercent = comparisonEnabled && comparisonType_ 
                ? getChangePercent(type.users, comparisonType_.users) 
                : null;
              
              return (
                <div key={type.type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{type.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold">{type.users.toLocaleString()} ({percentage}%)</span>
                      {changePercent !== null && (
                        <span className={`text-xs flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(changePercent).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isNew ? 'bg-blue-500' : 'bg-green-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* התפלגות מכשירים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-500" />
            התפלגות מכשירים
          </h4>
          <div className="space-y-4">
            {data.devices.map((device) => {
              const Icon = getDeviceIcon(device.device);
              const colors: Record<string, string> = {
                'מחשב': 'bg-purple-500',
                'נייד': 'bg-blue-500',
                'טאבלט': 'bg-teal-500',
              };
              const comparisonDevice = comparisonData?.devices.find(d => d.device === device.device);
              const changePercent = comparisonEnabled && comparisonDevice
                ? getChangePercent(device.users, comparisonDevice.users)
                : null;
              
              return (
                <div key={device.device}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{device.device}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold">{device.users.toLocaleString()} ({device.percentage}%)</span>
                      {changePercent !== null && (
                        <span className={`text-xs flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(changePercent).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${colors[device.device] || 'bg-gray-500'}`}
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* דפים הכי נצפים */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          דפים הכי נצפים
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">דף</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">צפיות</th>
                {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">זמן ממוצע</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((page, idx) => {
                const comparisonPage = comparisonData?.topPages.find(p => p.page === page.page);
                const changePercent = comparisonEnabled && comparisonPage
                  ? getChangePercent(page.views, comparisonPage.views)
                  : null;
                
                return (
                  <tr key={page.page} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="text-gray-800 font-medium text-sm truncate block max-w-xs" title={page.page}>
                        {page.page.length > 40 ? page.page.substring(0, 40) + '...' : page.page}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-semibold">{page.views.toLocaleString()}</td>
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
                    <td className="py-3 px-4 text-gray-600">{formatDuration(page.avgTime)}</td>
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
