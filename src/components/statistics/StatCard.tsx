'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

/**
 * StatCard - כרטיס מטריקה עם מגמה
 * 
 * @param title - כותרת הכרטיס
 * @param value - הערך להצגה
 * @param trend - אחוז שינוי מהתקופה הקודמת
 * @param icon - אייקון לוסיד
 * @param color - צבע הכרטיס (blue, green, purple, orange, red)
 * @param format - פורמט: currency, number, percent
 * @param subtitle - תת-כותרת אופציונלית
 */
interface StatCardProps {
  title: string;
  value: number;
  trend?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink';
  format?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-100 text-indigo-600',
    text: 'text-indigo-600',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'bg-pink-100 text-pink-600',
    text: 'text-pink-600',
  },
};

export default function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  color = 'blue',
  format = 'currency',
  subtitle,
  loading = false,
}: StatCardProps) {
  const colors = colorClasses[color];

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString('he-IL');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.bg} rounded-xl shadow-sm border p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${colors.text}`}>
            {formatValue(value)}
          </p>
          
          {/* Trend indicator */}
          {trend !== undefined && (
            <TrendIndicator value={trend} />
          )}
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {/* Icon */}
        <div className={`${colors.icon} p-3 rounded-xl`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

/**
 * TrendIndicator - מחוון מגמה
 * מציג חץ למעלה/למטה/קו + אחוז שינוי
 */
interface TrendIndicatorProps {
  value: number;
  showLabel?: boolean;
}

export function TrendIndicator({ value, showLabel = true }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  const colorClass = isPositive 
    ? 'text-green-600 bg-green-100' 
    : isNegative 
    ? 'text-red-600 bg-red-100' 
    : 'text-gray-600 bg-gray-100';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {showLabel && (
        <span>
          {isPositive && '+'}
          {value.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * StatCardSkeleton - Skeleton loader לכרטיס
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );
}
