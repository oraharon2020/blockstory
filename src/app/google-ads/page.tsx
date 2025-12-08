'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  avg_cpc: number;
  cost_per_conversion: number;
  conversion_rate: number;
  impression_share: number;
}

interface Keyword {
  keyword: string;
  match_type: string;
  quality_score: number;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  avg_cpc: number;
}

interface SearchTerm {
  query: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

interface DailySummary {
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function GoogleAdsPage() {
  const { user, loading, currentBusiness } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'keywords' | 'search-terms'>('overview');
  const [dateRange, setDateRange] = useState('30');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, dateRange]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await fetch(
        `/api/google-ads?businessId=${currentBusiness.id}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setKeywords(data.keywords || []);
      setSearchTerms(data.searchTerms || []);
      setDailyData(data.dailySummary || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totals = {
    cost: dailyData.reduce((sum, d) => sum + d.cost, 0),
    clicks: dailyData.reduce((sum, d) => sum + d.clicks, 0),
    impressions: dailyData.reduce((sum, d) => sum + d.impressions, 0),
    conversions: dailyData.reduce((sum, d) => sum + d.conversions, 0),
    conversionValue: dailyData.reduce((sum, d) => sum + d.conversionValue, 0),
  };

  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const costPerConversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
  const roas = totals.cost > 0 ? totals.conversionValue / totals.cost : 0;

  // Aggregate campaigns by name (for pie chart)
  const campaignTotals = campaigns.reduce((acc, c) => {
    if (!acc[c.campaign_name]) {
      acc[c.campaign_name] = { name: c.campaign_name, cost: 0, conversions: 0 };
    }
    acc[c.campaign_name].cost += c.cost;
    acc[c.campaign_name].conversions += c.conversions;
    return acc;
  }, {} as Record<string, { name: string; cost: number; conversions: number }>);

  const campaignPieData = Object.values(campaignTotals).sort((a, b) => b.cost - a.cost).slice(0, 6);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <Sidebar />

      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Google Ads - לוח בקרה
          </h1>
          <p className="text-gray-500 mt-1">מעקב ביצועי קמפיינים, מילות מפתח וביטויי חיפוש</p>
        </div>

        {/* Date Range & Tabs */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              סקירה כללית
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'campaigns'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              קמפיינים
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'keywords'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              מילות מפתח
            </button>
            <button
              onClick={() => setActiveTab('search-terms')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'search-terms'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              ביטויי חיפוש
            </button>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-white"
          >
            <option value="7">7 ימים אחרונים</option>
            <option value="14">14 ימים אחרונים</option>
            <option value="30">30 ימים אחרונים</option>
            <option value="60">60 ימים אחרונים</option>
            <option value="90">90 ימים אחרונים</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : dailyData.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">אין נתונים עדיין</h3>
            <p className="text-yellow-700">
              עבור להגדרות → Google Ads כדי לחבר את החשבון שלך
            </p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">הוצאה כוללת</div>
                    <div className="text-2xl font-bold text-gray-900">₪{totals.cost.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">קליקים</div>
                    <div className="text-2xl font-bold text-blue-600">{totals.clicks.toLocaleString('he-IL')}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">חשיפות</div>
                    <div className="text-2xl font-bold text-gray-900">{totals.impressions.toLocaleString('he-IL')}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">המרות</div>
                    <div className="text-2xl font-bold text-green-600">{totals.conversions.toLocaleString('he-IL', { maximumFractionDigits: 1 })}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">CTR</div>
                    <div className="text-2xl font-bold text-purple-600">{avgCtr.toFixed(2)}%</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">עלות להמרה</div>
                    <div className="text-2xl font-bold text-orange-600">₪{costPerConversion.toFixed(0)}</div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Spend Chart */}
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">הוצאה יומית</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [`₪${value.toFixed(0)}`, 'הוצאה']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#93c5fd" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Campaign Distribution */}
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">חלוקה לפי קמפיינים</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={campaignPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="cost"
                          label={({ name, percent }) => `${name.substring(0, 15)}... (${(percent * 100).toFixed(0)}%)`}
                        >
                          {campaignPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₪${value.toFixed(0)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Conversions Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">קליקים והמרות</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
                      />
                      <Bar yAxisId="left" dataKey="clicks" fill="#3b82f6" name="קליקים" />
                      <Bar yAxisId="right" dataKey="conversions" fill="#10b981" name="המרות" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right p-4 font-medium text-gray-600">קמפיין</th>
                        <th className="text-right p-4 font-medium text-gray-600">סטטוס</th>
                        <th className="text-right p-4 font-medium text-gray-600">הוצאה</th>
                        <th className="text-right p-4 font-medium text-gray-600">קליקים</th>
                        <th className="text-right p-4 font-medium text-gray-600">חשיפות</th>
                        <th className="text-right p-4 font-medium text-gray-600">CTR</th>
                        <th className="text-right p-4 font-medium text-gray-600">CPC</th>
                        <th className="text-right p-4 font-medium text-gray-600">המרות</th>
                        <th className="text-right p-4 font-medium text-gray-600">עלות/המרה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.values(campaignTotals).sort((a, b) => b.cost - a.cost).map((campaign, idx) => {
                        const campaignData = campaigns.filter(c => c.campaign_name === campaign.name);
                        const totalClicks = campaignData.reduce((s, c) => s + c.clicks, 0);
                        const totalImpressions = campaignData.reduce((s, c) => s + c.impressions, 0);
                        const totalConversions = campaignData.reduce((s, c) => s + c.conversions, 0);
                        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
                        const cpc = totalClicks > 0 ? campaign.cost / totalClicks : 0;
                        const cpConv = totalConversions > 0 ? campaign.cost / totalConversions : 0;
                        const status = campaignData[0]?.status || 'unknown';

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">{campaign.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                status === 'enabled' ? 'bg-green-100 text-green-700' :
                                status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {status === 'enabled' ? 'פעיל' : status === 'paused' ? 'מושהה' : status}
                              </span>
                            </td>
                            <td className="p-4">₪{campaign.cost.toFixed(0)}</td>
                            <td className="p-4">{totalClicks.toLocaleString()}</td>
                            <td className="p-4">{totalImpressions.toLocaleString()}</td>
                            <td className="p-4">{ctr.toFixed(2)}%</td>
                            <td className="p-4">₪{cpc.toFixed(2)}</td>
                            <td className="p-4">{totalConversions.toFixed(1)}</td>
                            <td className="p-4">₪{cpConv.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === 'keywords' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right p-4 font-medium text-gray-600">מילת מפתח</th>
                        <th className="text-right p-4 font-medium text-gray-600">סוג התאמה</th>
                        <th className="text-right p-4 font-medium text-gray-600">ציון איכות</th>
                        <th className="text-right p-4 font-medium text-gray-600">הוצאה</th>
                        <th className="text-right p-4 font-medium text-gray-600">קליקים</th>
                        <th className="text-right p-4 font-medium text-gray-600">חשיפות</th>
                        <th className="text-right p-4 font-medium text-gray-600">CTR</th>
                        <th className="text-right p-4 font-medium text-gray-600">CPC</th>
                        <th className="text-right p-4 font-medium text-gray-600">המרות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {keywords.sort((a, b) => b.cost - a.cost).slice(0, 50).map((kw, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-4 font-medium">{kw.keyword}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              kw.match_type === 'Exact' ? 'bg-blue-100 text-blue-700' :
                              kw.match_type === 'Phrase' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {kw.match_type === 'Exact' ? 'מדויק' : 
                               kw.match_type === 'Phrase' ? 'ביטוי' : 
                               kw.match_type === 'Broad' ? 'רחב' : kw.match_type}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`font-medium ${
                              kw.quality_score >= 7 ? 'text-green-600' :
                              kw.quality_score >= 5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {kw.quality_score || '-'}/10
                            </span>
                          </td>
                          <td className="p-4">₪{kw.cost.toFixed(0)}</td>
                          <td className="p-4">{kw.clicks.toLocaleString()}</td>
                          <td className="p-4">{kw.impressions.toLocaleString()}</td>
                          <td className="p-4">{kw.ctr.toFixed(2)}%</td>
                          <td className="p-4">₪{kw.avg_cpc.toFixed(2)}</td>
                          <td className="p-4">{kw.conversions.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Search Terms Tab */}
            {activeTab === 'search-terms' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right p-4 font-medium text-gray-600">ביטוי חיפוש</th>
                        <th className="text-right p-4 font-medium text-gray-600">הוצאה</th>
                        <th className="text-right p-4 font-medium text-gray-600">קליקים</th>
                        <th className="text-right p-4 font-medium text-gray-600">חשיפות</th>
                        <th className="text-right p-4 font-medium text-gray-600">CTR</th>
                        <th className="text-right p-4 font-medium text-gray-600">המרות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {searchTerms.sort((a, b) => b.cost - a.cost).slice(0, 100).map((term, idx) => {
                        const ctr = term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">{term.query}</td>
                            <td className="p-4">₪{term.cost.toFixed(0)}</td>
                            <td className="p-4">{term.clicks.toLocaleString()}</td>
                            <td className="p-4">{term.impressions.toLocaleString()}</td>
                            <td className="p-4">{ctr.toFixed(2)}%</td>
                            <td className="p-4">{term.conversions.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
