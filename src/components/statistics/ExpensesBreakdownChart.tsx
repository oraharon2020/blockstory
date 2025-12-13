'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations';

/**
 * ExpensesBreakdownChart - גרף פילוח הוצאות
 * Bar chart אופקי שמציג את ההוצאות לפי קטגוריה
 */
interface ExpensesBreakdown {
  googleAds: number;
  facebookAds: number;
  tiktokAds: number;
  shipping: number;
  materials: number;
  creditCardFees: number;
  vat: number;
  expensesVat?: number;
  expensesNoVat?: number;
  refunds?: number;
  employeeCost?: number;
}

interface ExpensesBreakdownChartProps {
  data: ExpensesBreakdown;
  loading?: boolean;
}

const EXPENSE_LABELS: Record<string, { label: string; color: string }> = {
  googleAds: { label: 'Google Ads', color: '#4285F4' },
  facebookAds: { label: 'Facebook Ads', color: '#1877F2' },
  tiktokAds: { label: 'TikTok Ads', color: '#000000' },
  shipping: { label: 'משלוחים', color: '#F59E0B' },
  materials: { label: 'חומרים', color: '#8B5CF6' },
  creditCardFees: { label: 'עמלות אשראי', color: '#EC4899' },
  vat: { label: 'מע"מ', color: '#6B7280' },
  expensesVat: { label: 'הוצאות (כולל מע"מ)', color: '#EF4444' },
  expensesNoVat: { label: 'הוצאות (ללא מע"מ)', color: '#F97316' },
  refunds: { label: 'זיכויים', color: '#DC2626' },
  employeeCost: { label: 'עלויות עובדים', color: '#10B981' },
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-right" dir="rtl">
      <p className="font-medium text-gray-800">{item.payload.label}</p>
      <p className="text-lg font-bold" style={{ color: item.payload.color }}>
        {formatCurrency(item.value)}
      </p>
    </div>
  );
};

export default function ExpensesBreakdownChart({ data, loading }: ExpensesBreakdownChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = Object.entries(data)
    .filter(([key, value]) => {
      // Only include entries that have labels defined and positive values
      return EXPENSE_LABELS[key] && value > 0;
    })
    .map(([key, value]) => ({
      name: key,
      value,
      label: EXPENSE_LABELS[key].label,
      color: EXPENSE_LABELS[key].color,
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (!chartData.length || total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">פילוח הוצאות</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">פילוח הוצאות</h3>
        <span className="text-sm text-gray-500">סה"כ: {formatCurrency(total)}</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              type="category"
              dataKey="label"
              tick={{ fill: '#374151', fontSize: 12, textAnchor: 'end' }}
              axisLine={{ stroke: '#E5E7EB' }}
              width={100}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-800">
              ({((item.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
