/**
 * SearchTermsTab Component
 * 
 * טאב חיפושים באתר - מה אנשים מחפשים
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Package,
  XCircle,
  CheckCircle
} from 'lucide-react';

interface SearchData {
  terms: { term: string; searches: number; clicks: number; ctr: number; hasResults: boolean }[];
  summary: { 
    totalSearches: number; 
    uniqueTerms: number; 
    avgCtr: number;
    noResultsPercent: number;
  };
  opportunities: { term: string; searches: number; suggestion: string }[];
}

interface SearchTermsTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

export default function SearchTermsTab({ businessId, startDate, endDate }: SearchTermsTabProps) {
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'noResults' | 'lowCtr'>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
      });
      
      const res = await fetch(`/api/analytics/search-terms?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch search terms data');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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

  const filteredTerms = data.terms.filter(term => {
    if (filter === 'noResults') return !term.hasResults;
    if (filter === 'lowCtr') return term.ctr < 10 && term.hasResults;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">חיפושים באתר</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-indigo-700">סה"כ חיפושים</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">{data.summary.totalSearches.toLocaleString()}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">מונחים ייחודיים</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{data.summary.uniqueTerms}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">CTR ממוצע</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{data.summary.avgCtr.toFixed(1)}%</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">% ללא תוצאות</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{data.summary.noResultsPercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* הזדמנויות */}
      {data.opportunities.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            💡 הזדמנויות שזוהו
          </h4>
          <div className="space-y-2">
            {data.opportunities.map((opp, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-100">
                <div>
                  <span className="font-medium text-gray-800">"{opp.term}"</span>
                  <span className="text-sm text-gray-500 mr-2">({opp.searches} חיפושים)</span>
                </div>
                <span className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">{opp.suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* פילטרים */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          הכל ({data.terms.length})
        </button>
        <button
          onClick={() => setFilter('noResults')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'noResults' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ללא תוצאות ({data.terms.filter(t => !t.hasResults).length})
        </button>
        <button
          onClick={() => setFilter('lowCtr')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'lowCtr' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          CTR נמוך ({data.terms.filter(t => t.ctr < 10 && t.hasResults).length})
        </button>
      </div>

      {/* טבלת חיפושים */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-500" />
          מונחי חיפוש
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">מונח חיפוש</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">חיפושים</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">קליקים</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">CTR</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.map((term, idx) => (
                <tr key={term.term} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-800">"{term.term}"</span>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{term.searches.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-900">{term.clicks}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      term.ctr >= 20 ? 'bg-green-100 text-green-700' :
                      term.ctr >= 10 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {term.ctr.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {term.hasResults ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        יש תוצאות
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        אין תוצאות
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTerms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            אין חיפושים בפילטר הנבחר
          </div>
        )}
      </div>

      {/* תובנה */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h5 className="font-semibold text-indigo-900 mb-1">🔍 מה זה אומר?</h5>
            <p className="text-sm text-indigo-700">
              חיפושים באתר מגלים מה הלקוחות שלך באמת מחפשים. 
              {data.summary.noResultsPercent > 20 
                ? ` ${data.summary.noResultsPercent.toFixed(0)}% מהחיפושים לא מוצאים תוצאות - יש פה הזדמנות להוסיף מוצרים חדשים!`
                : data.summary.avgCtr < 15
                  ? ' שיעור הקליקים נמוך - ייתכן שתוצאות החיפוש לא רלוונטיות.'
                  : ' החיפוש באתר עובד טוב! המשיכו לעקוב אחרי מונחים חדשים.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
