'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DateRangePicker from '@/components/DateRangePicker';
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
  Legend,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, MousePointer, Eye, Target, DollarSign, Zap } from 'lucide-react';

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  status: string;
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  avg_cpc: number;
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

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  color = 'blue',
  trend 
}: { 
  title: string; 
  value: string; 
  subValue?: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: number;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

export default function GoogleAdsPage() {
  const { currentBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'keywords' | 'search-terms'>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<string>('all');
  
  // Date range state - default to last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, startDate, endDate]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/google-ads?businessId=${currentBusiness.id}&startDate=${startDate}&endDate=${endDate}`
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

  // Get unique campaign types
  const campaignTypes = useMemo(() => {
    const types = new Set(campaigns.map(c => c.campaign_type || 'Unknown'));
    return ['all', ...Array.from(types)];
  }, [campaigns]);

  // Filter campaigns by type
  const filteredCampaigns = useMemo(() => {
    if (campaignTypeFilter === 'all') return campaigns;
    return campaigns.filter(c => c.campaign_type === campaignTypeFilter);
  }, [campaigns, campaignTypeFilter]);

  // Calculate totals from filtered data
  const totals = useMemo(() => {
    const data = campaignTypeFilter === 'all' ? dailyData : 
      // If filtered, recalculate from campaigns
      filteredCampaigns.reduce((acc, c) => {
        const dateKey = c.date;
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, cost: 0, clicks: 0, impressions: 0, conversions: 0, conversionValue: 0 };
        }
        acc[dateKey].cost += c.cost;
        acc[dateKey].clicks += c.clicks;
        acc[dateKey].impressions += c.impressions;
        acc[dateKey].conversions += c.conversions;
        acc[dateKey].conversionValue += c.conversion_value || 0;
        return acc;
      }, {} as Record<string, DailySummary>);
    
    const dataArray = campaignTypeFilter === 'all' ? data : Object.values(data);
    
    return {
      cost: (dataArray as DailySummary[]).reduce((sum, d) => sum + d.cost, 0),
      clicks: (dataArray as DailySummary[]).reduce((sum, d) => sum + d.clicks, 0),
      impressions: (dataArray as DailySummary[]).reduce((sum, d) => sum + d.impressions, 0),
      conversions: (dataArray as DailySummary[]).reduce((sum, d) => sum + d.conversions, 0),
      conversionValue: (dataArray as DailySummary[]).reduce((sum, d) => sum + d.conversionValue, 0),
    };
  }, [dailyData, filteredCampaigns, campaignTypeFilter]);

  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const costPerConversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
  const roas = totals.cost > 0 ? totals.conversionValue / totals.cost : 0;

  // Aggregate campaigns by name
  const campaignTotals = useMemo(() => {
    return filteredCampaigns.reduce((acc, c) => {
      if (!acc[c.campaign_name]) {
        acc[c.campaign_name] = { 
          name: c.campaign_name, 
          type: c.campaign_type,
          status: c.status,
          cost: 0, 
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0
        };
      }
      acc[c.campaign_name].cost += c.cost;
      acc[c.campaign_name].clicks += c.clicks;
      acc[c.campaign_name].impressions += c.impressions;
      acc[c.campaign_name].conversions += c.conversions;
      acc[c.campaign_name].conversionValue += c.conversion_value || 0;
      return acc;
    }, {} as Record<string, { 
      name: string; 
      type: string;
      status: string;
      cost: number; 
      clicks: number;
      impressions: number;
      conversions: number;
      conversionValue: number;
    }>);
  }, [filteredCampaigns]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Get campaign type label in Hebrew
  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SEARCH': 'חיפוש',
      'PERFORMANCE_MAX': 'Performance Max',
      'SHOPPING': 'שופינג',
      'DISPLAY': 'תצוגה',
      'VIDEO': 'וידאו',
      'all': 'כל הקמפיינים',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#34A853" strokeWidth="2"/>
            </svg>
            Google Ads
          </h1>
          <p className="text-gray-500 mt-1">מעקב ביצועי קמפיינים, מילות מפתח וביטויי חיפוש</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Campaign Type Filter */}
          <select
            value={campaignTypeFilter}
            onChange={(e) => setCampaignTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {campaignTypes.map((type) => (
              <option key={type} value={type}>
                {getCampaignTypeLabel(type)}
              </option>
            ))}
          </select>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'overview', label: 'סקירה כללית' },
          { id: 'campaigns', label: 'קמפיינים' },
          { id: 'keywords', label: 'מילות מפתח' },
          { id: 'search-terms', label: 'ביטויי חיפוש' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
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
          <h3 className="text-lg font-medium text-yellow-800 mb-2">אין נתונים לתקופה זו</h3>
          <p className="text-yellow-700">
            נסה לבחור טווח תאריכים אחר או עבור להגדרות → Google Ads כדי לסנכרן נתונים
          </p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="הוצאה כוללת"
                  value={`₪${totals.cost.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`}
                  icon={DollarSign}
                  color="red"
                />
                <KPICard
                  title="קליקים"
                  value={totals.clicks.toLocaleString('he-IL')}
                  subValue={`CPC: ₪${avgCpc.toFixed(2)}`}
                  icon={MousePointer}
                  color="blue"
                />
                <KPICard
                  title="חשיפות"
                  value={totals.impressions.toLocaleString('he-IL')}
                  subValue={`CTR: ${avgCtr.toFixed(2)}%`}
                  icon={Eye}
                  color="purple"
                />
                <KPICard
                  title="המרות"
                  value={totals.conversions.toLocaleString('he-IL', { maximumFractionDigits: 1 })}
                  subValue={`עלות/המרה: ₪${costPerConversion.toFixed(0)}`}
                  icon={Target}
                  color="green"
                />
              </div>

              {/* ROAS Card - Only show if there's conversion value */}
              {totals.conversionValue > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Return on Ad Spend (ROAS)</p>
                      <p className="text-4xl font-bold mt-1">{roas.toFixed(2)}x</p>
                      <p className="text-green-100 text-sm mt-2">
                        הכנסות: ₪{totals.conversionValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <Zap className="w-16 h-16 text-white/20" />
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Cost & Conversions Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4">הוצאה והמרות יומיות</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'cost' ? `₪${value.toFixed(0)}` : value.toFixed(1),
                          name === 'cost' ? 'הוצאה' : 'המרות'
                        ]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
                        contentStyle={{ direction: 'rtl' }}
                      />
                      <Legend formatter={(value) => value === 'cost' ? 'הוצאה' : 'המרות'} />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#3b82f6" 
                        fill="url(#colorCost)" 
                        strokeWidth={2}
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="conversions" 
                        stroke="#10b981" 
                        fill="transparent" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Clicks Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4">קליקים יומיים</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), 'קליקים']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
                        contentStyle={{ direction: 'rtl' }}
                      />
                      <Bar dataKey="clicks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Campaigns Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold">קמפיינים מובילים</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="text-right p-3 font-medium text-gray-600">קמפיין</th>
                        <th className="text-right p-3 font-medium text-gray-600">סוג</th>
                        <th className="text-right p-3 font-medium text-gray-600">הוצאה</th>
                        <th className="text-right p-3 font-medium text-gray-600">קליקים</th>
                        <th className="text-right p-3 font-medium text-gray-600">המרות</th>
                        <th className="text-right p-3 font-medium text-gray-600">עלות/המרה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.values(campaignTotals)
                        .sort((a, b) => b.cost - a.cost)
                        .slice(0, 5)
                        .map((campaign, idx) => {
                          const cpConv = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-medium">{campaign.name}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  campaign.type === 'PERFORMANCE_MAX' ? 'bg-purple-100 text-purple-700' :
                                  campaign.type === 'SEARCH' ? 'bg-blue-100 text-blue-700' :
                                  campaign.type === 'SHOPPING' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {getCampaignTypeLabel(campaign.type)}
                                </span>
                              </td>
                              <td className="p-3">₪{campaign.cost.toFixed(0)}</td>
                              <td className="p-3">{campaign.clicks.toLocaleString()}</td>
                              <td className="p-3">{campaign.conversions.toFixed(1)}</td>
                              <td className="p-3 text-gray-600">₪{cpConv.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-right p-4 font-medium text-gray-600">קמפיין</th>
                      <th className="text-right p-4 font-medium text-gray-600">סוג</th>
                      <th className="text-right p-4 font-medium text-gray-600">סטטוס</th>
                      <th className="text-right p-4 font-medium text-gray-600">הוצאה</th>
                      <th className="text-right p-4 font-medium text-gray-600">קליקים</th>
                      <th className="text-right p-4 font-medium text-gray-600">חשיפות</th>
                      <th className="text-right p-4 font-medium text-gray-600">CTR</th>
                      <th className="text-right p-4 font-medium text-gray-600">CPC</th>
                      <th className="text-right p-4 font-medium text-gray-600">המרות</th>
                      <th className="text-right p-4 font-medium text-gray-600">עלות/המרה</th>
                      {totals.conversionValue > 0 && (
                        <th className="text-right p-4 font-medium text-gray-600">ROAS</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.values(campaignTotals)
                      .sort((a, b) => b.cost - a.cost)
                      .map((campaign, idx) => {
                        const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
                        const cpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
                        const cpConv = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
                        const campaignRoas = campaign.cost > 0 ? campaign.conversionValue / campaign.cost : 0;

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">{campaign.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                campaign.type === 'PERFORMANCE_MAX' ? 'bg-purple-100 text-purple-700' :
                                campaign.type === 'SEARCH' ? 'bg-blue-100 text-blue-700' :
                                campaign.type === 'SHOPPING' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {getCampaignTypeLabel(campaign.type)}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                campaign.status === 'enabled' ? 'bg-green-100 text-green-700' :
                                campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {campaign.status === 'enabled' ? 'פעיל' : campaign.status === 'paused' ? 'מושהה' : campaign.status}
                              </span>
                            </td>
                            <td className="p-4">₪{campaign.cost.toFixed(0)}</td>
                            <td className="p-4">{campaign.clicks.toLocaleString()}</td>
                            <td className="p-4">{campaign.impressions.toLocaleString()}</td>
                            <td className="p-4">{ctr.toFixed(2)}%</td>
                            <td className="p-4">₪{cpc.toFixed(2)}</td>
                            <td className="p-4">{campaign.conversions.toFixed(1)}</td>
                            <td className="p-4">₪{cpConv.toFixed(0)}</td>
                            {totals.conversionValue > 0 && (
                              <td className="p-4">
                                <span className={`font-medium ${campaignRoas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                  {campaignRoas.toFixed(2)}x
                                </span>
                              </td>
                            )}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {keywords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>אין נתוני מילות מפתח לתקופה זו</p>
                  <p className="text-sm mt-1">קמפייני PMAX לא מציגים מילות מפתח</p>
                </div>
              ) : (
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
                              kw.quality_score > 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {kw.quality_score > 0 ? `${kw.quality_score}/10` : '-'}
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
              )}
            </div>
          )}

          {/* Search Terms Tab */}
          {activeTab === 'search-terms' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {searchTerms.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>אין נתוני ביטויי חיפוש לתקופה זו</p>
                  <p className="text-sm mt-1">קמפייני PMAX לא מציגים ביטויי חיפוש</p>
                </div>
              ) : (
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
