/**
 * SalesTab Component
 * 
 * טאב מכירות - Funnel, נטישת עגלה, המרות
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  Target,
  DollarSign,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowDown,
  CheckCircle
} from 'lucide-react';

interface SalesData {
  funnel: { step: string; users: number; dropoff: number }[];
  cartAbandonment: number;
  avgOrderValue: number;
  conversionRate: number;
  purchasesBySource: { source: string; purchases: number; revenue: number }[];
}

interface SalesTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

export default function SalesTab({ businessId, startDate, endDate }: SalesTabProps) {
  const [data, setData] = useState<SalesData | null>(null);
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
      
      const res = await fetch(`/api/analytics/sales?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch sales data');
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

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח מכירות</h3>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* שיעור המרה */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-700 font-medium">שיעור המרה</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{data.conversionRate.toFixed(2)}%</p>
        </div>

        {/* ממוצע הזמנה */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-700 font-medium">ממוצע להזמנה</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{formatCurrency(data.avgOrderValue)}</p>
        </div>

        {/* נטישת עגלה */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange-700 font-medium">נטישת עגלה</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{data.cartAbandonment}%</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h4 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          משפך המרה (Funnel)
        </h4>
        
        <div className="space-y-4">
          {data.funnel.map((step, idx) => {
            const maxUsers = data.funnel[0]?.users || 1;
            const percentage = maxUsers > 0 ? (step.users / maxUsers) * 100 : 0;
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-green-500'];
            
            return (
              <div key={step.step}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center text-white font-bold text-sm`}>
                      {idx + 1}
                    </div>
                    <span className="font-medium text-gray-800">{step.step}</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-900">{step.users.toLocaleString()}</span>
                    {step.dropoff > 0 && (
                      <span className="text-red-500 text-sm mr-2">
                        ({step.dropoff}% נטישה)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div 
                    className={`h-full ${colors[idx]} transition-all duration-700 flex items-center justify-end px-3`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && (
                      <span className="text-white text-sm font-medium">{percentage.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                {idx < data.funnel.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">הכנסות</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">% מסה"כ</th>
              </tr>
            </thead>
            <tbody>
              {data.purchasesBySource.map((source, idx) => {
                const totalRevenue = data.purchasesBySource.reduce((sum, s) => sum + s.revenue, 0);
                const percentage = totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0;
                return (
                  <tr key={source.source} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-800">{source.source}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{source.purchases}</td>
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
