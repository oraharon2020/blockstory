/**
 * ChannelPerformanceCard - כרטיס ביצועי ערוצים
 * 
 * מציג CPA ו-ROAS לכל ערוץ פרסום
 */
'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface ChannelData {
  channel: string;
  sessions: number;
  conversions: number;
  revenue: number;
  spend: number;
  cpa: number;
  roas: number;
}

interface ChannelPerformanceCardProps {
  businessId?: string;
  startDate?: string;
  endDate?: string;
  loading?: boolean;
}

const CHANNEL_LABELS: Record<string, { name: string; color: string }> = {
  google: { name: 'Google Ads', color: 'bg-blue-500' },
  facebook: { name: 'Facebook/Instagram', color: 'bg-indigo-500' },
  tiktok: { name: 'TikTok', color: 'bg-gray-800' },
  organic: { name: 'אורגני', color: 'bg-green-500' },
  direct: { name: 'ישיר', color: 'bg-purple-500' },
  other: { name: 'אחר', color: 'bg-gray-400' },
};

export default function ChannelPerformanceCard({ businessId, startDate, endDate, loading: externalLoading }: ChannelPerformanceCardProps) {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchChannelData();
    }
  }, [businessId, startDate, endDate]);

  const fetchChannelData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        businessId: businessId!,
        report: 'overview',
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await fetch(`/api/analytics?${params}`);
      const data = await res.json();
      
      if (data.needsAuth) {
        setNeedsConnection(true);
        setChannels([]);
      } else if (data.channels) {
        setChannels(data.channels);
        setNeedsConnection(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">ביצועי ערוצים</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (needsConnection) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">ביצועי ערוצים</h3>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <Link2 className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-3">חבר Google Analytics לצפייה בנתוני ערוצים</p>
          <a
            href="/settings"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            עבור להגדרות
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">ביצועי ערוצים</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">ביצועי ערוצים</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalConversions = channels.reduce((sum, c) => sum + c.conversions, 0);
  const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const overallCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">ביצועי ערוצים</h3>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-500">CPA ממוצע</p>
            <p className="font-bold text-gray-900">{formatCurrency(overallCPA)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">ROAS</p>
            <p className="font-bold text-green-600">{overallROAS.toFixed(1)}x</p>
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div className="space-y-3">
        {channels.map((channel) => {
          const label = CHANNEL_LABELS[channel.channel] || { name: channel.channel, color: 'bg-gray-400' };
          const spendPercent = totalSpend > 0 ? (channel.spend / totalSpend) * 100 : 0;
          
          return (
            <div key={channel.channel} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${label.color}`} />
                  <span className="font-medium text-gray-800">{label.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <span className="text-gray-500">הוצאה</span>
                    <p className="font-semibold">{formatCurrency(channel.spend)}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500">המרות</span>
                    <p className="font-semibold">{channel.conversions}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500">CPA</span>
                    <p className="font-semibold">{channel.cpa > 0 ? formatCurrency(channel.cpa) : '-'}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500">ROAS</span>
                    <p className={`font-semibold ${channel.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {channel.roas > 0 ? `${channel.roas.toFixed(1)}x` : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${label.color} transition-all`}
                  style={{ width: `${spendPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t flex justify-between text-sm">
        <span className="text-gray-500">
          סה"כ הוצאות פרסום: <strong className="text-gray-900">{formatCurrency(totalSpend)}</strong>
        </span>
        <span className="text-gray-500">
          סה"כ המרות: <strong className="text-gray-900">{totalConversions}</strong>
        </span>
      </div>
    </div>
  );
}
