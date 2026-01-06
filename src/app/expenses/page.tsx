'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ExpensesManager from '@/components/ExpensesManager';
import { ArrowRight, Calendar } from 'lucide-react';

const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function ExpensesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="סגור חלון"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#217346]" />
              <h1 className="text-lg font-bold text-gray-900">
                ניהול הוצאות
              </h1>
              <span className="px-2 py-0.5 bg-[#217346] text-white text-sm rounded-md font-medium">
                {monthNames[month - 1]} {year}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            דאבל-קליק לעריכה • Enter לשמירה
          </div>
        </div>
      </div>

      {/* Full Height Content */}
      <div className="flex-1 flex flex-col">
        <ExpensesManager
          month={month}
          year={year}
          onClose={() => window.close()}
          isFullPage={true}
        />
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">טוען...</div>
      </div>
    }>
      <ExpensesPageContent />
    </Suspense>
  );
}
