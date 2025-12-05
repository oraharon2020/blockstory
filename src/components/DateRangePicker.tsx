'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const PRESETS = [
  { label: 'היום', days: 0 },
  { label: '7 ימים', days: 7 },
  { label: '14 ימים', days: 14 },
  { label: '30 ימים', days: 30 },
  { label: '90 ימים', days: 90 },
];

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    onChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    setIsOpen(false);
  };

  const handlePrevWeek = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
    
    onChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  const handleNextWeek = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    // Don't go beyond today
    if (end >= today) return;
    
    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);
    
    // Cap at today
    if (end > today) {
      onChange(
        start.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
    } else {
      onChange(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <button
        onClick={handlePrevWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="שבוע קודם"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:border-blue-500 transition-colors"
        >
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="font-medium">
            {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
          </span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-2 right-0 z-20 bg-white rounded-xl shadow-xl border p-4 min-w-[200px]">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">בחר טווח זמן</p>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => handlePreset(preset.days)}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              
              <div className="border-t mt-4 pt-4">
                <p className="text-sm text-gray-500 mb-2">או בחר תאריכים</p>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onChange(e.target.value, endDate)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onChange(startDate, e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleNextWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title="שבוע הבא"
        disabled={new Date(endDate) >= new Date()}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}
