/**
 * ComparisonSelector Component
 * 
 * קומפוננטה לבחירת תקופת השוואה
 */

'use client';

import { useState } from 'react';
import { GitCompare, ChevronDown, X } from 'lucide-react';

interface ComparisonSelectorProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  comparisonType: 'previous' | 'custom' | 'year';
  onTypeChange: (type: 'previous' | 'custom' | 'year') => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  currentPeriodLabel: string;
}

export default function ComparisonSelector({
  enabled,
  onToggle,
  comparisonType,
  onTypeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  currentPeriodLabel,
}: ComparisonSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const comparisonOptions = [
    { id: 'previous' as const, label: 'תקופה קודמת', description: 'לפני התקופה הנוכחית' },
    { id: 'year' as const, label: 'שנה שעברה', description: 'אותה תקופה שנה שעברה' },
    { id: 'custom' as const, label: 'תקופה מותאמת', description: 'בחר תאריכים' },
  ];

  const selectedOption = comparisonOptions.find(opt => opt.id === comparisonType);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Toggle Button */}
        <button
          onClick={() => onToggle(!enabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            enabled
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>השוואה</span>
          {enabled && (
            <X 
              className="w-4 h-4 hover:text-red-500" 
              onClick={(e) => {
                e.stopPropagation();
                onToggle(false);
              }}
            />
          )}
        </button>

        {/* Comparison Type Selector */}
        {enabled && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            >
              <span>{selectedOption?.label}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[200px]">
                {comparisonOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onTypeChange(option.id);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-right px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      comparisonType === option.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Date Inputs */}
        {enabled && comparisonType === 'custom' && onCustomDateChange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate || ''}
              onChange={(e) => onCustomDateChange(e.target.value, customEndDate || '')}
              className="px-2 py-1.5 border rounded-lg text-sm"
            />
            <span className="text-gray-400">עד</span>
            <input
              type="date"
              value={customEndDate || ''}
              onChange={(e) => onCustomDateChange(customStartDate || '', e.target.value)}
              className="px-2 py-1.5 border rounded-lg text-sm"
            />
          </div>
        )}
      </div>

      {/* Current Period Info */}
      {enabled && (
        <div className="mt-2 text-xs text-gray-500">
          משווה {currentPeriodLabel} עם {selectedOption?.label.toLowerCase()}
        </div>
      )}
    </div>
  );
}
