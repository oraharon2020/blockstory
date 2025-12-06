'use client';

import { Trophy, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

/**
 * HighlightsCard - כרטיס הישגים ומידע מעניין
 * מציג את הימים הטובים ביותר ומידע נוסף
 */
interface HighlightsCardProps {
  bestDay: { date: string; revenue: number } | null;
  worstDay: { date: string; revenue: number } | null;
  mostProfitableDay: { date: string; profit: number } | null;
  daysWithData: number;
  loading?: boolean;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('he-IL', { 
    day: 'numeric', 
    month: 'long',
    weekday: 'long'
  });
};

export default function HighlightsCard({
  bestDay,
  worstDay,
  mostProfitableDay,
  daysWithData,
  loading,
}: HighlightsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="space-y-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const highlights = [
    {
      icon: Trophy,
      title: 'היום עם ההכנסות הגבוהות ביותר',
      date: bestDay?.date,
      value: bestDay?.revenue,
      color: 'yellow',
      format: 'currency' as const,
    },
    {
      icon: TrendingUp,
      title: 'היום הכי רווחי',
      date: mostProfitableDay?.date,
      value: mostProfitableDay?.profit,
      color: 'green',
      format: 'currency' as const,
    },
    {
      icon: AlertCircle,
      title: 'היום עם ההכנסות הנמוכות ביותר',
      date: worstDay?.date,
      value: worstDay?.revenue,
      color: 'red',
      format: 'currency' as const,
    },
  ];

  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">נקודות מעניינות</h3>
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          {daysWithData} ימים עם נתונים
        </span>
      </div>
      
      <div className="space-y-4">
        {highlights.map((item, index) => {
          if (!item.date || item.value === undefined) return null;
          
          const Icon = item.icon;
          
          return (
            <div 
              key={index}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className={`p-2 rounded-lg ${colorClasses[item.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{item.title}</p>
                <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">
                  {item.format === 'currency' ? formatCurrency(item.value) : item.value}
                </p>
              </div>
            </div>
          );
        })}
        
        {!bestDay && !mostProfitableDay && !worstDay && (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2" />
            <p>אין מספיק נתונים להצגת נקודות מעניינות</p>
          </div>
        )}
      </div>
    </div>
  );
}
