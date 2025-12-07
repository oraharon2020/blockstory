'use client';

import { Suspense } from 'react';
import SupplierOrdersManager from '@/components/supplier-orders/SupplierOrdersManager';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, Loader2 } from 'lucide-react';

function SupplierOrdersContent() {
  const { currentBusiness } = useAuth();

  if (!currentBusiness?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <Truck className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-600">לא נבחר עסק</h2>
        <p className="text-gray-500">יש לבחור עסק מהתפריט כדי לצפות בהזמנות לספקים</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">הזמנות לספקים</h1>
              <p className="text-sm text-gray-500">ניהול הזמנות, עדכון מחירים והנפקת דוחות לספקים</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <SupplierOrdersManager businessId={currentBusiness.id} />
      </div>
    </div>
  );
}

export default function SupplierOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SupplierOrdersContent />
    </Suspense>
  );
}