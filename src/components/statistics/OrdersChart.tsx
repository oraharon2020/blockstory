'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

/**
 * OrdersChart - גרף הזמנות יומיות
 * Bar chart שמציג את מספר ההזמנות לפי יום
 */
interface ChartData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  expenses: number;
}

interface OrdersChartProps {
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
      <p className="font-medium text-gray-800 mb-1">{formatDate(label)}</p>
      <p className="text-lg font-bold text-purple-600">
        {payload[0].value} הזמנות
      </p>
    </div>
  );
};

export default function OrdersChart({ data, loading }: OrdersChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">הזמנות יומיות</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  // Calculate average
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const avgOrders = data.length > 0 ? totalOrders / data.length : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">הזמנות יומיות</h3>
        <span className="text-sm text-gray-500">
          ממוצע: {avgOrders.toFixed(1)} הזמנות/יום
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fill: '#6B7280', fontSize: 10 }}
              axisLine={{ stroke: '#E5E7EB' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={avgOrders} 
              stroke="#9333EA" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />
            <Bar 
              dataKey="orders" 
              fill="#A855F7" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
