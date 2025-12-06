'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface OrderStatus {
  slug: string;
  name: string;
  name_en?: string;
  total?: number;
}

interface OrderStatusSelectorProps {
  businessId: string;
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
}

export default function OrderStatusSelector({ businessId, selectedStatuses, onChange }: OrderStatusSelectorProps) {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    loadStatuses();
  }, [businessId]);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/woo-statuses?businessId=${businessId}`);
      const json = await res.json();
      setStatuses(json.statuses || []);
      setSource(json.source || 'default');
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (slug: string) => {
    if (selectedStatuses.includes(slug)) {
      onChange(selectedStatuses.filter(s => s !== slug));
    } else {
      onChange([...selectedStatuses, slug]);
    }
  };

  const getStatusColor = (slug: string) => {
    const colors: Record<string, string> = {
      'completed': 'bg-green-100 border-green-300 text-green-800',
      'processing': 'bg-blue-100 border-blue-300 text-blue-800',
      'on-hold': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'pending': 'bg-orange-100 border-orange-300 text-orange-800',
      'cancelled': 'bg-red-100 border-red-300 text-red-800',
      'refunded': 'bg-purple-100 border-purple-300 text-purple-800',
      'failed': 'bg-gray-100 border-gray-300 text-gray-800',
      'trash': 'bg-gray-100 border-gray-300 text-gray-500',
    };
    return colors[slug] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-500">טוען סטטוסים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">סטטוסים שנספרים כהכנסה:</span>
          {source === 'woocommerce' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              מסונכרן מהחנות
            </span>
          )}
        </div>
        <button
          onClick={loadStatuses}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>רענן</span>
        </button>
      </div>

      {selectedStatuses.length === 0 && (
        <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>יש לבחור לפחות סטטוס אחד</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const isSelected = selectedStatuses.includes(status.slug);
          return (
            <button
              key={status.slug}
              onClick={() => toggleStatus(status.slug)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                ${isSelected 
                  ? `${getStatusColor(status.slug)} border-current ring-2 ring-offset-1 ring-current/30` 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }
              `}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${isSelected ? 'bg-current border-current' : 'border-gray-300'}
              `}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="font-medium">{status.name}</span>
              {status.total !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-gray-100'}`}>
                  {status.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        רק הזמנות בסטטוסים שנבחרו יכללו בחישוב ההכנסות והרווחים
      </p>
    </div>
  );
}
