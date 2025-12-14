/**
 * MarketTrendsTab Component
 * 
 * טאב טרנדים בשוק - מה חם עכשיו בתחום הרהיטים
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Flame,
  Search,
  Lightbulb,
  Target,
  BarChart3,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface TrendItem {
  keyword: string;
  interest: number;
  trend: 'rising' | 'stable' | 'declining';
  change: number;
  relatedQueries: string[];
}

interface MarketInsight {
  category: string;
  hotProducts: string[];
  risingTrends: string[];
  seasonalTip: string;
}

interface TrendsData {
  trends: TrendItem[];
  insights: MarketInsight[];
  topSearches: { term: string; volume: string; trend: 'up' | 'down' | 'stable' }[];
  recommendations: string[];
}

interface MarketTrendsTabProps {
  businessId: string;
}

export default function MarketTrendsTab({ businessId }: MarketTrendsTabProps) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ businessId });
      const res = await fetch(`/api/analytics/market-trends?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch market trends');
      }
      
      setData(json);
      if (json.trends?.length > 0) {
        setSelectedTrend(json.trends[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising':
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'declining':
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">טרנדים בשוק</h3>
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">BETA</span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* המלצות מותאמות */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          המלצות מותאמות לעסק שלך
        </h4>
        <div className="space-y-2">
          {data.recommendations.map((rec, idx) => (
            <div key={idx} className="text-sm text-purple-800 bg-white/60 rounded-lg p-3">
              {rec.split('**').map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </div>
          ))}
        </div>
      </div>

      {/* חיפושים פופולריים */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          מה אנשים מחפשים בגוגל (תחום רהיטים)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.topSearches.map((search, idx) => (
            <div 
              key={search.term}
              className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer group"
              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(search.term)}`, '_blank')}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">#{idx + 1}</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(search.trend)}
                  <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="font-medium text-gray-800 text-sm">{search.term}</div>
              <div className="text-xs text-gray-500">{search.volume} חיפושים/חודש</div>
            </div>
          ))}
        </div>
      </div>

      {/* טרנדים עולים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* רשימת טרנדים */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-500" />
            מוצרים טרנדיים עכשיו
          </h4>
          <div className="space-y-2">
            {data.trends.map((trend) => (
              <div
                key={trend.keyword}
                onClick={() => setSelectedTrend(trend)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedTrend?.keyword === trend.keyword
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(trend.trend)}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getTrendColor(trend.trend)}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                    <span className="font-medium text-gray-800">{trend.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                        style={{ width: `${trend.interest}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{trend.interest}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* פרטי טרנד נבחר */}
        {selectedTrend && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              פרטי טרנד: {selectedTrend.keyword}
            </h4>
            
            <div className="space-y-4">
              {/* סטטיסטיקות */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">רמת עניין</div>
                  <div className="text-2xl font-bold text-gray-900">{selectedTrend.interest}/100</div>
                </div>
                <div className={`rounded-lg p-3 ${getTrendColor(selectedTrend.trend)}`}>
                  <div className="text-sm opacity-80 mb-1">שינוי</div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    {selectedTrend.change > 0 ? <ArrowUpRight className="w-5 h-5" /> : selectedTrend.change < 0 ? <ArrowDownRight className="w-5 h-5" /> : null}
                    {selectedTrend.change > 0 ? '+' : ''}{selectedTrend.change}%
                  </div>
                </div>
              </div>

              {/* חיפושים קשורים */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">חיפושים קשורים:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTrend.relatedQueries.map((query) => (
                    <span 
                      key={query}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>

              {/* כפתור פעולה */}
              <button 
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => window.open(`https://trends.google.com/trends/explore?q=${encodeURIComponent(selectedTrend.keyword)}&geo=IL`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                צפה ב-Google Trends
              </button>
            </div>
          </div>
        )}
      </div>

      {/* תובנות לפי קטגוריה */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.insights.map((insight) => (
          <div key={insight.category} className="bg-white rounded-xl shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              {insight.category}
            </h4>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1.5">🔥 מוצרים חמים:</div>
                <div className="flex flex-wrap gap-1.5">
                  {insight.hotProducts.map((product) => (
                    <span key={product} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 mb-1.5">📈 טרנדים עולים:</div>
                <div className="flex flex-wrap gap-1.5">
                  {insight.risingTrends.map((trend) => (
                    <span key={trend} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                      {trend}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                {insight.seasonalTip}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* הסבר */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <strong>מאיפה הנתונים?</strong> הנתונים מבוססים על ניתוח חיפושים בגוגל, טרנדים עונתיים ותובנות שוק בתחום הרהיטים בישראל.
            רמת העניין (0-100) מציינת כמה פופולרי מונח החיפוש ביחס לשיא שלו.
          </div>
        </div>
      </div>
    </div>
  );
}
