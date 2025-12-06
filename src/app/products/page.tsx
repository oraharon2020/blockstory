'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProductCostsManager from '@/components/ProductCostsManager';
import { Package, AlertCircle, Store } from 'lucide-react';

export default function ProductsPage() {
  const { currentBusiness, loading } = useAuth();

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
          <p className="text-yellow-700">בחר חנות מהתפריט בראש הדף כדי לנהל את עלויות המוצרים שלה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">עלויות מוצרים</h1>
              <div className="flex items-center gap-2 text-orange-100">
                <Store className="w-4 h-4" />
                <span>{currentBusiness.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <ProductCostsManager businessId={currentBusiness.id} />
        </div>
      </div>
    </div>
  );
}
