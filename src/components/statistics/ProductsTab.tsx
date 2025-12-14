/**
 * ProductsTab Component
 * 
 * טאב מוצרים - מוצרים נצפים, נמכרים והמרות
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Eye, 
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Star,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ComparisonSelector from './ComparisonSelector';

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
  const [comparisonData, setComparisonData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonType, setComparisonType] = useState<'previous' | 'year' | 'custom'>('previous');
  const [customComparisonStart, setCustomComparisonStart] = useState('');
  const [customComparisonEnd, setCustomComparisonEnd] = useState('');

  // Search and display state
  const [searchViewed, setSearchViewed] = useState('');
  const [searchSelling, setSearchSelling] = useState('');
  const [showAllViewed, setShowAllViewed] = useState(false);
  const [showAllSelling, setShowAllSelling] = useState(false);
  const [sortViewedBy, setSortViewedBy] = useState<'views' | 'addToCartRate'>('views');
  const [sortViewedDesc, setSortViewedDesc] = useState(true);
  const [sortSellingBy, setSortSellingBy] = useState<'quantity' | 'revenue'>('revenue');
  const [sortSellingDesc, setSortSellingDesc] = useState(true);

  // Calculate comparison dates based on type
  const getComparisonDates = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (comparisonType === 'previous') {
      const compEnd = new Date(start);
      compEnd.setDate(compEnd.getDate() - 1);
      const compStart = new Date(compEnd);
      compStart.setDate(compStart.getDate() - daysDiff);
      return {
        startDate: compStart.toISOString().split('T')[0],
        endDate: compEnd.toISOString().split('T')[0]
      };
    } else if (comparisonType === 'year') {
      const compStart = new Date(start);
      compStart.setFullYear(compStart.getFullYear() - 1);
      const compEnd = new Date(end);
      compEnd.setFullYear(compEnd.getFullYear() - 1);
      return {
        startDate: compStart.toISOString().split('T')[0],
        endDate: compEnd.toISOString().split('T')[0]
      };
    } else {
      return {
        startDate: customComparisonStart,
        endDate: customComparisonEnd
      };
    }
  };

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

      // Fetch comparison data if enabled
      if (comparisonEnabled) {
        const compDates = getComparisonDates();
        if (compDates.startDate && compDates.endDate) {
          const compParams = new URLSearchParams({
            businessId,
            startDate: compDates.startDate,
            endDate: compDates.endDate,
          });
          
          const compRes = await fetch(`/api/analytics/products?${compParams}`);
          const compJson = await compRes.json();
          
          if (compRes.ok) {
            setComparisonData(compJson);
          }
        }
      } else {
        setComparisonData(null);
      }
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
  }, [businessId, startDate, endDate, comparisonEnabled, comparisonType, customComparisonStart, customComparisonEnd]);

  const getChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

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

  // Calculate totals
  const totalViews = data.topViewed.reduce((sum, p) => sum + p.views, 0);
  const totalSold = data.topSelling.reduce((sum, p) => sum + p.quantity, 0);
  const totalRevenue = data.topSelling.reduce((sum, p) => sum + p.revenue, 0);

  // Filter and sort viewed products
  const filteredViewed = data.topViewed
    .filter(p => p.name.toLowerCase().includes(searchViewed.toLowerCase()))
    .sort((a, b) => {
      const aVal = sortViewedBy === 'views' ? a.views : a.addToCartRate;
      const bVal = sortViewedBy === 'views' ? b.views : b.addToCartRate;
      return sortViewedDesc ? bVal - aVal : aVal - bVal;
    });
  const displayedViewed = showAllViewed ? filteredViewed : filteredViewed.slice(0, 10);

  // Filter and sort selling products
  const filteredSelling = data.topSelling
    .filter(p => p.name.toLowerCase().includes(searchSelling.toLowerCase()))
    .sort((a, b) => {
      const aVal = sortSellingBy === 'quantity' ? a.quantity : a.revenue;
      const bVal = sortSellingBy === 'quantity' ? b.quantity : b.revenue;
      return sortSellingDesc ? bVal - aVal : aVal - bVal;
    });
  const displayedSelling = showAllSelling ? filteredSelling : filteredSelling.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח מוצרים</h3>
        </div>
        <div className="flex items-center gap-3">
          <ComparisonSelector
            enabled={comparisonEnabled}
            onToggle={setComparisonEnabled}
            comparisonType={comparisonType}
            onTypeChange={setComparisonType}
            customStartDate={customComparisonStart}
            customEndDate={customComparisonEnd}
            onCustomDateChange={(start, end) => {
              setCustomComparisonStart(start);
              setCustomComparisonEnd(end);
            }}
            currentPeriodLabel={`${startDate} - ${endDate}`}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* סיכום כללי */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">סה"כ צפיות במוצרים</div>
          <div className="text-2xl font-bold text-blue-900">{totalViews.toLocaleString()}</div>
          <div className="text-xs text-blue-600">{data.topViewed.length} מוצרים שונים</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
          <div className="text-sm text-yellow-700 mb-1">סה"כ יחידות שנמכרו</div>
          <div className="text-2xl font-bold text-yellow-900">{totalSold.toLocaleString()}</div>
          <div className="text-xs text-yellow-600">{data.topSelling.length} מוצרים שונים</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="text-sm text-green-700 mb-1">סה"כ הכנסות ממוצרים</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-green-600">לפי GA4</div>
        </div>
      </div>

      {/* 2 טבלאות בשורה */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* מוצרים הכי נצפים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              מוצרים הכי נצפים
              <span className="text-xs font-normal text-gray-500">({filteredViewed.length} מוצרים)</span>
            </h4>
          </div>
          
          {/* חיפוש */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="חפש מוצר..."
              value={searchViewed}
              onChange={(e) => setSearchViewed(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">#</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">מוצר</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    <button 
                      onClick={() => { setSortViewedBy('views'); setSortViewedDesc(!sortViewedDesc); }}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      צפיות
                      {sortViewedBy === 'views' && (sortViewedDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  </th>
                  {comparisonEnabled && <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">שינוי</th>}
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    <button 
                      onClick={() => { setSortViewedBy('addToCartRate'); setSortViewedDesc(!sortViewedDesc); }}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      % לעגלה
                      {sortViewedBy === 'addToCartRate' && (sortViewedDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedViewed.map((product, idx) => {
                  const compProduct = comparisonData?.topViewed.find(p => p.name === product.name);
                  const changePercent = comparisonEnabled && compProduct
                    ? getChangePercent(product.views, compProduct.views)
                    : null;
                  
                  return (
                    <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 text-sm">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="text-gray-800 text-sm font-medium truncate block max-w-[150px]" title={product.name}>
                          {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-900 text-sm font-semibold">{product.views.toLocaleString()}</td>
                      {comparisonEnabled && (
                        <td className="py-2 px-3">
                          {changePercent !== null ? (
                            <span className={`text-xs flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {Math.abs(changePercent).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <span className={`text-sm font-medium ${product.addToCartRate >= 10 ? 'text-green-600' : product.addToCartRate >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {product.addToCartRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* כפתור הצג עוד */}
          {filteredViewed.length > 10 && (
            <button
              onClick={() => setShowAllViewed(!showAllViewed)}
              className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllViewed ? `הצג פחות` : `הצג את כל ${filteredViewed.length} המוצרים`}
            </button>
          )}
        </div>

        {/* מוצרים הכי נמכרים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              מוצרים הכי נמכרים
              <span className="text-xs font-normal text-gray-500">({filteredSelling.length} מוצרים)</span>
            </h4>
          </div>
          
          {/* חיפוש */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="חפש מוצר..."
              value={searchSelling}
              onChange={(e) => setSearchSelling(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">#</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">מוצר</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    <button 
                      onClick={() => { setSortSellingBy('quantity'); setSortSellingDesc(!sortSellingDesc); }}
                      className="flex items-center gap-1 hover:text-yellow-600"
                    >
                      נמכרו
                      {sortSellingBy === 'quantity' && (sortSellingDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  </th>
                  {comparisonEnabled && <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">שינוי</th>}
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    <button 
                      onClick={() => { setSortSellingBy('revenue'); setSortSellingDesc(!sortSellingDesc); }}
                      className="flex items-center gap-1 hover:text-yellow-600"
                    >
                      הכנסות
                      {sortSellingBy === 'revenue' && (sortSellingDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedSelling.map((product, idx) => {
                  const compProduct = comparisonData?.topSelling.find(p => p.name === product.name);
                  const changePercent = comparisonEnabled && compProduct
                    ? getChangePercent(product.quantity, compProduct.quantity)
                    : null;
                  
                  return (
                    <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 text-sm">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="text-gray-800 text-sm font-medium truncate block max-w-[150px]" title={product.name}>
                          {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-900 text-sm font-semibold">{product.quantity}</td>
                      {comparisonEnabled && (
                        <td className="py-2 px-3">
                          {changePercent !== null ? (
                            <span className={`text-xs flex items-center gap-0.5 ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {Math.abs(changePercent).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-2 px-3 text-green-600 text-sm font-semibold">{formatCurrency(product.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* כפתור הצג עוד */}
          {filteredSelling.length > 10 && (
            <button
              onClick={() => setShowAllSelling(!showAllSelling)}
              className="w-full mt-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            >
              {showAllSelling ? `הצג פחות` : `הצג את כל ${filteredSelling.length} המוצרים`}
            </button>
          )}
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
