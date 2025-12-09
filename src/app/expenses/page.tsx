'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ExpensesManager from '@/components/ExpensesManager';
import { ArrowRight } from 'lucide-react';

function ExpensesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="חזור"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              ניהול הוצאות - {month}/{year}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg">
          <ExpensesManager
            month={month}
            year={year}
            onClose={() => router.back()}
            isFullPage={true}
          />
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">טוען...</div>
      </div>
    }>
      <ExpensesPageContent />
    </Suspense>
  );
}
