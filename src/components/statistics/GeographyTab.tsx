/**
 * GeographyTab Component
 * 
 * טאב גיאוגרפיה - מאיפה הלקוחות, שיעור המרה לפי אזור
 * עם תמיכה בהשוואה בין תקופות
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  MapPin, 
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Target
} from 'lucide-react';
import ComparisonSelector from './ComparisonSelector';

interface GeoData {
  countries: { country: string; users: number; sessions: number; conversions: number; revenue: number; conversionRate: number }[];
  cities: { city: string; country: string; users: number; conversions: number; revenue: number }[];
  summary: { totalCountries: number; topCountry: string; topCountryPercent: number };
}

interface GeographyTabProps {
  businessId: string;
  startDate: string;
  endDate: string;
}

export default function GeographyTab({ businessId, startDate, endDate }: GeographyTabProps) {
  const [data, setData] = useState<GeoData | null>(null);
  const [comparisonData, setComparisonData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'countries' | 'cities'>('countries');
  
  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonType, setComparisonType] = useState<'previous' | 'year' | 'custom'>('previous');
  const [customCompareStart, setCustomCompareStart] = useState('');
  const [customCompareEnd, setCustomCompareEnd] = useState('');

  // Calculate comparison dates
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
        start: compStart.toISOString().split('T')[0],
        end: compEnd.toISOString().split('T')[0]
      };
    } else if (comparisonType === 'year') {
      const compStart = new Date(start);
      compStart.setFullYear(compStart.getFullYear() - 1);
      const compEnd = new Date(end);
      compEnd.setFullYear(compEnd.getFullYear() - 1);
      return {
        start: compStart.toISOString().split('T')[0],
        end: compEnd.toISOString().split('T')[0]
      };
    } else {
      return { start: customCompareStart, end: customCompareEnd };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ businessId, startDate, endDate });
      const res = await fetch(`/api/analytics/geography?${params}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch geography data');
      setData(json);

      // Fetch comparison data if enabled
      if (comparisonEnabled) {
        const compDates = getComparisonDates();
        if (compDates.start && compDates.end) {
          const compParams = new URLSearchParams({
            businessId,
            startDate: compDates.start,
            endDate: compDates.end,
          });
          const compRes = await fetch(`/api/analytics/geography?${compParams}`);
          if (compRes.ok) {
            const compJson = await compRes.json();
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
  }, [businessId, startDate, endDate, comparisonEnabled, comparisonType, customCompareStart, customCompareEnd]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const renderChange = (current: number, previous: number | undefined) => {
    if (!comparisonEnabled || previous === undefined) return null;
    const change = getChangePercent(current, previous);
    if (change === null) return <span className="text-gray-400 text-xs">—</span>;
    
    return (
      <span className={`text-xs flex items-center gap-0.5 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
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

  // Find comparison values for summary
  const compSummary = comparisonData?.summary;

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">ניתוח גיאוגרפי</h3>
        </div>
        <div className="flex items-center gap-3">
          <ComparisonSelector
            enabled={comparisonEnabled}
            onToggle={setComparisonEnabled}
            comparisonType={comparisonType}
            onTypeChange={setComparisonType}
            customStartDate={customCompareStart}
            customEndDate={customCompareEnd}
            onCustomDateChange={(start, end) => {
              setCustomCompareStart(start);
              setCustomCompareEnd(end);
            }}
            currentPeriodLabel={`${startDate} - ${endDate}`}
          />
          {/* Toggle בין מדינות לערים */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('countries')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'countries' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              מדינות
            </button>
            <button
              onClick={() => setView('cities')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'cities' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ערים
            </button>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">מדינות פעילות</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-blue-900">{data.summary.totalCountries}</p>
            {renderChange(data.summary.totalCountries, compSummary?.totalCountries)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">מדינה מובילה</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{data.summary.topCountry}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-green-600">{data.summary.topCountryPercent}% מהתנועה</p>
            {renderChange(data.summary.topCountryPercent, compSummary?.topCountryPercent)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">המרה הכי גבוהה</span>
          </div>
          {data.countries.length > 0 && (() => {
            const maxRate = Math.max(...data.countries.map(c => c.conversionRate));
            const bestCountry = data.countries.find(c => c.conversionRate === maxRate);
            const compBest = comparisonData?.countries.find(c => c.country === bestCountry?.country);
            return (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-purple-900">{maxRate.toFixed(1)}%</p>
                  {compBest && renderChange(maxRate, compBest.conversionRate)}
                </div>
                <p className="text-sm text-purple-600">{bestCountry?.country}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* טבלת מדינות */}
      {view === 'countries' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            ביצועים לפי מדינה
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">מדינה</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">משתמשים</th>
                  {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">סשנים</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">המרות</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">% המרה</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">הכנסות</th>
                  {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                </tr>
              </thead>
              <tbody>
                {data.countries.map((country) => {
                  const compCountry = comparisonData?.countries.find(c => c.country === country.country);
                  return (
                    <tr key={country.country} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(country.country)}</span>
                          <span className="font-medium text-gray-800">{country.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{country.users.toLocaleString()}</td>
                      {comparisonEnabled && (
                        <td className="py-3 px-4">{renderChange(country.users, compCountry?.users)}</td>
                      )}
                      <td className="py-3 px-4 text-gray-900">{country.sessions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-900">{country.conversions}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          country.conversionRate >= 3 ? 'bg-green-100 text-green-700' :
                          country.conversionRate >= 1 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {country.conversionRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-green-600 font-semibold">{formatCurrency(country.revenue)}</td>
                      {comparisonEnabled && (
                        <td className="py-3 px-4">{renderChange(country.revenue, compCountry?.revenue)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* טבלת ערים */}
      {view === 'cities' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            ערים מובילות
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">עיר</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">מדינה</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">משתמשים</th>
                  {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">המרות</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">הכנסות</th>
                  {comparisonEnabled && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">שינוי</th>}
                </tr>
              </thead>
              <tbody>
                {data.cities.map((city) => {
                  const compCity = comparisonData?.cities.find(c => c.city === city.city && c.country === city.country);
                  return (
                    <tr key={`${city.city}-${city.country}`} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{city.city}</td>
                      <td className="py-3 px-4 text-gray-600">{city.country}</td>
                      <td className="py-3 px-4 text-gray-900">{city.users.toLocaleString()}</td>
                      {comparisonEnabled && (
                        <td className="py-3 px-4">{renderChange(city.users, compCity?.users)}</td>
                      )}
                      <td className="py-3 px-4 text-gray-900">{city.conversions}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">{formatCurrency(city.revenue)}</td>
                      {comparisonEnabled && (
                        <td className="py-3 px-4">{renderChange(city.revenue, compCity?.revenue)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* תובנה */}
      {data.countries.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h5 className="font-semibold text-blue-900 mb-1">💡 תובנה</h5>
              <p className="text-sm text-blue-700">
                {data.summary.topCountryPercent > 80 
                  ? `רוב התנועה שלך (${data.summary.topCountryPercent}%) מגיעה מ${data.summary.topCountry}. שקול להרחיב לשווקים נוספים.`
                  : data.countries.some(c => c.conversionRate > 5)
                    ? `יש לך שיעורי המרה גבוהים במדינות מסוימות. שקול להגדיל את הפרסום שם.`
                    : `התנועה שלך מגוונת גיאוגרפית. זה מצוין לפיזור סיכונים!`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// עזר - דגלי מדינות
function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'Israel': '🇮🇱',
    'ישראל': '🇮🇱',
    'United States': '🇺🇸',
    'ארצות הברית': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'בריטניה': '🇬🇧',
    'Germany': '🇩🇪',
    'גרמניה': '🇩🇪',
    'France': '🇫🇷',
    'צרפת': '🇫🇷',
    'Canada': '🇨🇦',
    'קנדה': '🇨🇦',
    'Australia': '🇦🇺',
    'אוסטרליה': '🇦🇺',
    'Russia': '🇷🇺',
    'רוסיה': '🇷🇺',
    'Spain': '🇪🇸',
    'ספרד': '🇪🇸',
    'Italy': '🇮🇹',
    'איטליה': '🇮🇹',
    'Netherlands': '🇳🇱',
    'הולנד': '🇳🇱',
    'Brazil': '🇧🇷',
    'ברזיל': '🇧🇷',
    'India': '🇮🇳',
    'הודו': '🇮🇳',
  };
  return flags[country] || '🌍';
}
