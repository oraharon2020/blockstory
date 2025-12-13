/**
 * ProductsTab Component
 * 
 * טאב מוצרים - מוצרים נצפים, נמכרים והמרות
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Eye, 
  ShoppingBag,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Star
} from 'lucide-react';

interface ProductsData {
  topViewed: { name: string; views: number; addToCartRate: number }[];
  topSelling: { name: string; quantity: number; revenue: number }[];
  lowConversion: { name: string; views: number; purchases: number; conversionRate: number }[];
}

interface ProductsTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

export default function ProductsTab({ businessId, startDate, endDate }: ProductsTabProps) {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
      });
      
      const res = await fetch(`/api/analytics/products?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch products data');
      }
      
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId && startDate && endDate) {
      fetchData();
    }
  }, [businessId, startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 mb-3">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח מוצרים</h3>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2 טבלאות בשורה */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* מוצרים הכי נצפים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            מוצרים הכי נצפים
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">#</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">מוצר</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">צפיות</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">% הוספה לעגלה</th>
                </tr>
              </thead>
              <tbody>
                {data.topViewed.map((product, idx) => (
                  <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 text-sm">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <span className="text-gray-800 text-sm font-medium truncate block max-w-[150px]" title={product.name}>
                        {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-900 text-sm font-semibold">{product.views.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className={`text-sm font-medium ${product.addToCartRate >= 10 ? 'text-green-600' : product.addToCartRate >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {product.addToCartRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* מוצרים הכי נמכרים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            מוצרים הכי נמכרים
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">#</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">מוצר</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">נמכרו</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">הכנסות</th>
                </tr>
              </thead>
              <tbody>
                {data.topSelling.map((product, idx) => (
                  <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 text-sm">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <span className="text-gray-800 text-sm font-medium truncate block max-w-[150px]" title={product.name}>
                        {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-900 text-sm font-semibold">{product.quantity}</td>
                    <td className="py-2 px-3 text-green-600 text-sm font-semibold">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* מוצרים עם המרה נמוכה */}
      {data.lowConversion.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            מוצרים עם שיעור המרה נמוך
            <span className="text-xs font-normal text-gray-500">(הרבה צפיות, מעט רכישות)</span>
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            מוצרים אלה מקבלים תנועה אך לא ממירים טוב. כדאי לבדוק מחיר, תיאור או תמונות.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">מוצר</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">צפיות</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">רכישות</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">% המרה</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">המלצה</th>
                </tr>
              </thead>
              <tbody>
                {data.lowConversion.map((product) => (
                  <tr key={product.name} className="border-b border-gray-50 hover:bg-orange-50">
                    <td className="py-3 px-4">
                      <span className="text-gray-800 font-medium truncate block max-w-xs" title={product.name}>
                        {product.name.length > 35 ? product.name.substring(0, 35) + '...' : product.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{product.views.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-900">{product.purchases}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {product.conversionRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-orange-600">
                        {product.conversionRate < 1 ? 'בדוק מחיר/תיאור' : 'שפר תמונות'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* אם אין מוצרים עם המרה נמוכה */}
      {data.lowConversion.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <ShoppingBag className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-medium">מעולה! אין מוצרים עם שיעור המרה בעייתי</p>
          <p className="text-green-600 text-sm">כל המוצרים מתפקדים טוב</p>
        </div>
      )}
    </div>
  );
}
