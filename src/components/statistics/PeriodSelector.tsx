'use client';

/**
 * PeriodSelector - בוחר תקופה
 * מאפשר בחירת טווח זמן לסטטיסטיקות
 */

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
}

const periods = [
  { id: 'week', label: 'שבוע אחרון' },
  { id: 'month', label: 'חודש נוכחי' },
  { id: 'quarter', label: 'רבעון נוכחי' },
  { id: 'year', label: 'שנה נוכחית' },
  { id: 'custom', label: 'טווח מותאם' },
];

export default function PeriodSelector({
  value,
  onChange,
  startDate,
  endDate,
  onDateChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period buttons */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => onChange(period.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              value === period.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {value === 'custom' && onDateChange && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onDateChange(e.target.value, endDate || '')}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <span className="text-gray-400">עד</span>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onDateChange(startDate || '', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
}
