'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeesManager from '@/components/EmployeesManager';
import { Users, AlertCircle, Store, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EmployeesPage() {
  const { currentBusiness, loading } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="max-w-2xl mx-auto p-8" dir="rtl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">לא נבחרה חנות</h2>
          <p className="text-yellow-700">בחר חנות מהתפריט בראש הדף כדי לנהל עובדים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">ניהול עובדים</h1>
                <div className="flex items-center gap-2 text-indigo-100">
                  <Store className="w-4 h-4" />
                  <span>{currentBusiness.name}</span>
                </div>
              </div>
            </div>
            
            {/* Month Selector */}
            <div className="flex items-center gap-3 bg-white/20 rounded-lg px-4 py-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1 hover:bg-white/20 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="font-medium min-w-[120px] text-center">
                {monthNames[selectedMonth.month]} {selectedMonth.year}
              </span>
              <button
                onClick={goToNextMonth}
                className="p-1 hover:bg-white/20 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <EmployeesManager
            month={selectedMonth.month}
            year={selectedMonth.year}
          />
        </div>
      </div>
      
      {/* Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-700">
          💡 <strong>טיפ:</strong> השכר החודשי מתחלק אוטומטית בכל ימי החודש. 
          העלות היומית תופיע בטבלת התזרים ולא ניתנת לשינוי ידני.
        </p>
      </div>
    </div>
  );
}
