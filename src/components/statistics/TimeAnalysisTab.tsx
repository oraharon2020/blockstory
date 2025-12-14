/**
 * TimeAnalysisTab Component
 * 
 * טאב ניתוח זמנים - מתי הכי קונים, שעות ו ימים
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sun,
  Moon
} from 'lucide-react';

interface TimeData {
  hourly: { hour: number; users: number; conversions: number; revenue: number }[];
  daily: { day: string; dayNum: number; users: number; conversions: number; revenue: number }[];
  peakHour: { hour: number; label: string };
  peakDay: { day: string; dayNum: number };
  insights: { bestTimeToPost: string; worstTime: string; recommendation: string };
}

interface TimeAnalysisTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

export default function TimeAnalysisTab({ businessId, startDate, endDate }: TimeAnalysisTabProps) {
  const [data, setData] = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'hours' | 'days'>('hours');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
      });
      
      const res = await fetch(`/api/analytics/time-analysis?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch time analysis data');
      }
      
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId && startDate && endDate) {
      fetchData();
    }
  }, [businessId, startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getHourLabel = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getDayName = (dayNum: number) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[dayNum] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 mb-3">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!data) return null;

  const maxHourlyUsers = Math.max(...data.hourly.map(h => h.users));
  const maxDailyUsers = Math.max(...data.daily.map(d => d.users));

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח זמנים</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle בין שעות לימים */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('hours')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'hours' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 inline ml-1" />
              שעות
            </button>
            <button
              onClick={() => setView('days')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'days' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 inline ml-1" />
              ימים
            </button>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-700">שעת שיא</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{data.peakHour.label}</p>
          <p className="text-sm text-orange-600">הכי הרבה משתמשים</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">יום הכי פעיל</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">יום {data.peakDay.day}</p>
          <p className="text-sm text-blue-600">הכי הרבה תנועה</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">הזמן הטוב לפרסום</span>
          </div>
          <p className="text-xl font-bold text-green-900">{data.insights.bestTimeToPost}</p>
        </div>
      </div>

      {/* גרף שעות */}
      {view === 'hours' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            פעילות לפי שעה (24 שעות)
          </h4>
          
          {/* Heat map style */}
          <div className="grid grid-cols-12 gap-1 mb-4">
            {data.hourly.slice(0, 12).map((hour) => {
              const intensity = maxHourlyUsers > 0 ? hour.users / maxHourlyUsers : 0;
              return (
                <div
                  key={hour.hour}
                  className="relative group"
                >
                  <div
                    className="h-16 rounded-lg flex items-end justify-center transition-all cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: `rgba(249, 115, 22, ${0.1 + intensity * 0.8})`,
                    }}
                  >
                    <span className="text-xs text-gray-600 mb-1">{getHourLabel(hour.hour)}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                      <div className="font-semibold">{getHourLabel(hour.hour)}</div>
                      <div>משתמשים: {hour.users}</div>
                      <div>המרות: {hour.conversions}</div>
                      <div>הכנסות: {formatCurrency(hour.revenue)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-1">
            {data.hourly.slice(12, 24).map((hour) => {
              const intensity = maxHourlyUsers > 0 ? hour.users / maxHourlyUsers : 0;
              return (
                <div
                  key={hour.hour}
                  className="relative group"
                >
                  <div
                    className="h-16 rounded-lg flex items-end justify-center transition-all cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: `rgba(249, 115, 22, ${0.1 + intensity * 0.8})`,
                    }}
                  >
                    <span className="text-xs text-gray-600 mb-1">{getHourLabel(hour.hour)}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                      <div className="font-semibold">{getHourLabel(hour.hour)}</div>
                      <div>משתמשים: {hour.users}</div>
                      <div>המרות: {hour.conversions}</div>
                      <div>הכנסות: {formatCurrency(hour.revenue)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* מקרא */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">פחות פעיל</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                  <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(249, 115, 22, ${o})` }} />
                ))}
              </div>
              <span className="text-xs text-gray-500">יותר פעיל</span>
              <Sun className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* גרף ימים */}
      {view === 'days' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            פעילות לפי יום בשבוע
          </h4>
          
          <div className="space-y-3">
            {data.daily.map((day) => {
              const widthPercent = maxDailyUsers > 0 ? (day.users / maxDailyUsers) * 100 : 0;
              return (
                <div key={day.dayNum} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-gray-700">
                    יום {day.day}
                  </div>
                  <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-sm font-medium text-gray-800">
                        {day.users.toLocaleString()} משתמשים
                      </span>
                      <span className="text-sm text-gray-600">
                        {day.conversions} המרות | {formatCurrency(day.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* המלצה */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h5 className="font-semibold text-orange-900 mb-1">⏰ המלצה לתזמון קמפיינים</h5>
            <p className="text-sm text-orange-700">{data.insights.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
