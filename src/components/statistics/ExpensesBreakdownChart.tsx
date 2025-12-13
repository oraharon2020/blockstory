'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/calculations';

/**
 * ExpensesBreakdownChart - פילוח הוצאות
 * Treemap - משבצות צבעוניות לפי גודל ההוצאה
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
  employeeCost: { label: 'עובדים', color: '#10B981' },
  materials: { label: 'חומרים', color: '#8B5CF6' },
  expensesVat: { label: 'הוצאות+מעמ', color: '#EF4444' },
  expensesNoVat: { label: 'הוצאות', color: '#F97316' },
  vat: { label: 'מע"מ', color: '#6B7280' },
  googleAds: { label: 'Google', color: '#4285F4' },
  facebookAds: { label: 'Facebook', color: '#1877F2' },
  tiktokAds: { label: 'TikTok', color: '#171717' },
  shipping: { label: 'משלוחים', color: '#F59E0B' },
  creditCardFees: { label: 'אשראי', color: '#EC4899' },
  refunds: { label: 'זיכויים', color: '#DC2626' },
};

// Custom content for treemap cells
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, label, value, percentage, color } = props;
  
  // Don't render if too small
  if (width < 40 || height < 30) return null;
  
  const showValue = width > 70 && height > 50;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        style={{ cursor: 'pointer' }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - (showValue ? 8 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={width > 80 ? 13 : 11}
        fontWeight="600"
      >
        {label}
      </text>
      {showValue && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.9)"
            fontSize={11}
          >
            {percentage}%
          </text>
        </>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border text-right" dir="rtl">
      <p className="font-semibold text-gray-800">{item.label}</p>
      <p className="text-lg font-bold" style={{ color: item.color }}>
        {formatCurrency(item.value)}
      </p>
      <p className="text-sm text-gray-500">{item.percentage}% מההוצאות</p>
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

  // Transform data
  const total = Object.entries(data)
    .filter(([key]) => EXPENSE_LABELS[key])
    .reduce((sum, [, value]) => sum + (value || 0), 0);

  const chartData = Object.entries(data)
    .filter(([key, value]) => EXPENSE_LABELS[key] && value > 0)
    .map(([key, value]) => ({
      name: key,
      value,
      label: EXPENSE_LABELS[key].label,
      color: EXPENSE_LABELS[key].color,
      percentage: ((value / total) * 100).toFixed(0),
    }))
    .sort((a, b) => b.value - a.value);

  if (!chartData.length || total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">פילוח הוצאות</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">פילוח הוצאות</h3>
        <span className="text-sm font-medium text-gray-600">סה"כ: {formatCurrency(total)}</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={chartData}
            dataKey="value"
            aspectRatio={4/3}
            stroke="#fff"
            content={<CustomizedContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
