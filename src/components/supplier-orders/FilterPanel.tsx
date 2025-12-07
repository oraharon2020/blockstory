'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Hash, 
  Search, 
  Filter, 
  X,
  ChevronDown,
  Check,
  RefreshCw
} from 'lucide-react';
import { FilterOptions, OrderStatus } from './types';

interface FilterPanelProps {
  businessId: string;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onRefresh: () => void;
}

export default function FilterPanel({
  businessId,
  filters,
  onFiltersChange,
  onRefresh,
}: FilterPanelProps) {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Set default dates (last 30 days)
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      onFiltersChange({
        ...filters,
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      });
    }
  }, []);

  // Load order statuses
  useEffect(() => {
    loadStatuses();
  }, [businessId]);

  const loadStatuses = async () => {
    try {
      const res = await fetch(`/api/woo-statuses?businessId=${businessId}`);
      const json = await res.json();
      setStatuses(json.statuses || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const handleFilterTypeChange = (type: 'date' | 'orders') => {
    onFiltersChange({ ...filters, filterType: type });
  };

  const toggleStatus = (slug: string) => {
    const newStatuses = filters.statuses.includes(slug)
      ? filters.statuses.filter(s => s !== slug)
      : [...filters.statuses, slug];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const clearFilters = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    onFiltersChange({
      filterType: 'date',
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      orderIds: '',
      statuses: [],
      searchTerm: '',
      showReadyOnly: false,
      showNotReadyOnly: false,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-500" />
          סינון הזמנות
        </h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          נקה סינון
        </button>
      </div>

      {/* Filter Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleFilterTypeChange('date')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
            filters.filterType === 'date'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          לפי טווח תאריכים
        </button>
        <button
          onClick={() => handleFilterTypeChange('orders')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
            filters.filterType === 'orders'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Hash className="w-4 h-4" />
          לפי מספרי הזמנות
        </button>
      </div>

      {/* Date Range Filter */}
      {filters.filterType === 'date' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">מתאריך</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">עד תאריך</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Order IDs Filter */}
      {filters.filterType === 'orders' && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            מספרי הזמנות (מופרדים בפסיק)
          </label>
          <input
            type="text"
            value={filters.orderIds}
            onChange={(e) => onFiltersChange({ ...filters, orderIds: e.target.value })}
            placeholder="לדוגמה: 1234, 1235, 1236"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Status Multi-Select */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-600 mb-1">סטטוס הזמנה</label>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg hover:border-gray-400 transition-colors"
        >
          <span className="text-gray-600">
            {filters.statuses.length === 0 
              ? 'כל הסטטוסים' 
              : `${filters.statuses.length} סטטוסים נבחרו`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showStatusDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowStatusDropdown(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {statuses.length === 0 ? (
                <div className="p-3 text-center text-gray-500">טוען סטטוסים...</div>
              ) : (
                statuses.map(status => (
                  <button
                    key={status.slug}
                    onClick={() => toggleStatus(status.slug)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      filters.statuses.includes(status.slug)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {filters.statuses.includes(status.slug) && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-gray-700">{status.name}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Search & Ready Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-600 mb-1">חיפוש</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              placeholder="חפש לפי מספר הזמנה או מוצר..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Ready Status */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">סטטוס הכנה</label>
          <div className="flex gap-2">
            <button
              onClick={() => onFiltersChange({ 
                ...filters, 
                showReadyOnly: false, 
                showNotReadyOnly: false 
              })}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                !filters.showReadyOnly && !filters.showNotReadyOnly
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              הכל
            </button>
            <button
              onClick={() => onFiltersChange({ 
                ...filters, 
                showReadyOnly: true, 
                showNotReadyOnly: false 
              })}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                filters.showReadyOnly
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              ✓ מוכן
            </button>
            <button
              onClick={() => onFiltersChange({ 
                ...filters, 
                showReadyOnly: false, 
                showNotReadyOnly: true 
              })}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                filters.showNotReadyOnly
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              ממתין
            </button>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          החל סינון
        </button>
      </div>
    </div>
  );
}
