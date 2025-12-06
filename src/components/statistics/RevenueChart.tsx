'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations';

/**
 * RevenueChart - גרף הכנסות ורווח לאורך זמן
 * Area chart שמציג את ההכנסות והרווח
 */
interface ChartData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  expenses: number;
}

interface RevenueChartProps {
  data: ChartData[];
  loading?: boolean;
}

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-right" dir="rtl">
      <p className="font-medium text-gray-800 mb-2">{formatDate(label)}</p>
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
          <span className="font-medium">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">הכנסות ורווח</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">הכנסות ורווח</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="הכנסות"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="רווח"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
