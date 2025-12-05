'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

interface MonthPickerProps {
  month: number; // 0-11
  year: number;
  onChange: (month: number, year: number) => void;
}

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function MonthPicker({ month, year, onChange }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrevMonth = () => {
    if (month === 0) {
      onChange(11, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Don't go beyond current month
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return;
    }

    if (month === 11) {
      onChange(0, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  const handleMonthSelect = (selectedMonth: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Don't allow future months
    if (year > currentYear || (year === currentYear && selectedMonth > currentMonth)) {
      return;
    }

    onChange(selectedMonth, year);
    setIsOpen(false);
  };

  const handleYearChange = (delta: number) => {
    const newYear = year + delta;
    const now = new Date();
    
    // Don't go into the future
    if (newYear > now.getFullYear()) return;
    
    // If going to current year, make sure month is valid
    if (newYear === now.getFullYear() && month > now.getMonth()) {
      onChange(now.getMonth(), newYear);
    } else {
      onChange(month, newYear);
    }
  };

  const isNextDisabled = () => {
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());
  };

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <button
        onClick={handlePrevMonth}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="חודש קודם"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:border-blue-500 transition-colors min-w-[180px] justify-center"
        >
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="font-medium">
            {MONTHS_HE[month]} {year}
          </span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-2 right-0 z-20 bg-white rounded-xl shadow-xl border p-4 min-w-[280px]">
              {/* Year selector */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => handleYearChange(-1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="font-bold text-lg">{year}</span>
                <button
                  onClick={() => handleYearChange(1)}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  disabled={year >= new Date().getFullYear()}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_HE.map((monthName, idx) => {
                  const now = new Date();
                  const isFuture = year > now.getFullYear() || 
                    (year === now.getFullYear() && idx > now.getMonth());
                  const isSelected = idx === month;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleMonthSelect(idx)}
                      disabled={isFuture}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isFuture
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleNextMonth}
        disabled={isNextDisabled()}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
        title="חודש הבא"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

// Helper functions
export function getMonthDays(month: number, year: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Use local date formatting to avoid timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push(dateStr);
  }
  
  return days;
}

export function getMonthRange(month: number, year: number): { start: string; end: string } {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
  };
}
