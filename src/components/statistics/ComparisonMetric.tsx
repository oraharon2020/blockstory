/**
 * ComparisonMetric Component
 * 
 * מציג מספר עם השוואה לתקופה קודמת
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonMetricProps {
  label: string;
  current: number;
  previous?: number;
  format?: 'number' | 'currency' | 'percent' | 'duration';
  showComparison?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ComparisonMetric({
  label,
  current,
  previous,
  format = 'number',
  showComparison = true,
  size = 'md',
  className = '',
}: ComparisonMetricProps) {
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return `₪${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'duration':
        const mins = Math.floor(value / 60);
        const secs = Math.floor(value % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      default:
        return value.toLocaleString('he-IL');
    }
  };

  const getChangePercent = (): number | null => {
    if (previous === undefined || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const changePercent = getChangePercent();
  const isPositive = changePercent !== null && changePercent > 0;
  const isNegative = changePercent !== null && changePercent < 0;
  const isNeutral = changePercent === null || (changePercent >= -0.5 && changePercent <= 0.5);

  // For some metrics, negative is good (bounce rate, CPA)
  const isGoodChange = isPositive; // Can be customized based on metric type

  const sizeClasses = {
    sm: { value: 'text-lg', label: 'text-xs', change: 'text-xs' },
    md: { value: 'text-2xl', label: 'text-sm', change: 'text-sm' },
    lg: { value: 'text-3xl', label: 'text-base', change: 'text-base' },
  };

  return (
    <div className={`${className}`}>
      <div className={`${sizeClasses[size].label} text-gray-500 mb-1`}>{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`${sizeClasses[size].value} font-bold text-gray-900`}>
          {formatValue(current)}
        </span>
        
        {showComparison && previous !== undefined && changePercent !== null && (
          <div className={`flex items-center gap-1 ${sizeClasses[size].change} ${
            isNeutral ? 'text-gray-400' : isGoodChange ? 'text-green-600' : 'text-red-500'
          }`}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {showComparison && previous !== undefined && (
        <div className={`${sizeClasses[size].change} text-gray-400 mt-0.5`}>
          לעומת {formatValue(previous)}
        </div>
      )}
    </div>
  );
}
