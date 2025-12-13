/**
 * TrafficTab Component
 * 
 * טאב תנועה - מציג נתוני משתמשים, מכשירים ודפים נצפים
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  TrendingDown,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

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

export default function TrafficTab({ businessId, startDate, endDate }: TrafficTabProps) {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
      });
      
      const res = await fetch(`/api/analytics/traffic?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch traffic data');
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
          onClick={fetchData}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalUsers = data.userTypes.reduce((sum, t) => sum + t.users, 0);

  return (
    <div className="space-y-6">
      {/* כותרת עם כפתור רענון */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח תנועה</h3>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* סה"כ משתמשים */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-700 font-medium">סה"כ משתמשים</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{totalUsers.toLocaleString()}</p>
        </div>

        {/* זמן ממוצע */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-700 font-medium">זמן ממוצע באתר</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{formatDuration(data.avgSessionDuration)}</p>
        </div>

        {/* שיעור נטישה */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange-700 font-medium">שיעור נטישה</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{data.bounceRate.toFixed(1)}%</p>
        </div>
      </div>

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
              return (
                <div key={type.type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{type.type}</span>
                    <span className="text-gray-900 font-semibold">{type.users.toLocaleString()} ({percentage}%)</span>
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
              return (
                <div key={device.device}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{device.device}</span>
                    </div>
                    <span className="text-gray-900 font-semibold">{device.users.toLocaleString()} ({device.percentage}%)</span>
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
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">זמן ממוצע</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((page, idx) => (
                <tr key={page.page} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="text-gray-800 font-medium text-sm truncate block max-w-xs" title={page.page}>
                      {page.page.length > 40 ? page.page.substring(0, 40) + '...' : page.page}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 font-semibold">{page.views.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDuration(page.avgTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
