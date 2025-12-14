'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Eye, EyeOff, TestTube, Check, X, Store, Calculator, Package, HelpCircle, ListChecks, Truck, Webhook, BarChart3, Copy, ExternalLink, Link2, Mail, PieChart } from 'lucide-react';
import ProductCostsManager from './ProductCostsManager';
import OrderStatusSelector from './OrderStatusSelector';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SettingsFormData {
  wooUrl: string;
  consumerKey: string;
  consumerSecret: string;
  vatRate: number;
  creditCardRate: number;
  creditFeeMode: 'percentage' | 'manual';
  expensesSpreadMode: 'exact' | 'spread';
  shippingCost: number;
  materialsRate: number;
  validOrderStatuses: string[];
  manualShippingPerItem: boolean;
  chargeShippingOnFreeOrders: boolean;
  freeShippingMethods: string[];
}

type TabType = 'woocommerce' | 'business' | 'products' | 'integrations' | 'webhook';

export default function SettingsPage() {
  const { currentBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('woocommerce');
  const [settings, setSettings] = useState<SettingsFormData>({
    wooUrl: '',
    consumerKey: '',
    consumerSecret: '',
    vatRate: 18,
    creditCardRate: 2.5,
    creditFeeMode: 'percentage',
    expensesSpreadMode: 'exact',
    shippingCost: 0,
    materialsRate: 30,
    validOrderStatuses: ['completed', 'processing'],
    manualShippingPerItem: false,
    chargeShippingOnFreeOrders: true,
    freeShippingMethods: ['local_pickup'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState({
    consumerKey: false,
    consumerSecret: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadSettings();
    }
  }, [currentBusiness?.id]);

  const loadSettings = async () => {
    if (!currentBusiness?.id) return;
    
    try {
      // Load business-specific settings
      const res = await fetch(`/api/business-settings?businessId=${currentBusiness.id}`);
      const json = await res.json();
      if (json.data) {
        setSettings({
          wooUrl: json.data.wooUrl || '',
          consumerKey: json.data.consumerKey || '',
          consumerSecret: json.data.consumerSecret || '',
          vatRate: parseFloat(json.data.vatRate) || 18,
          creditCardRate: parseFloat(json.data.creditCardRate) || 2.5,
          creditFeeMode: json.data.creditFeeMode || 'percentage',
          expensesSpreadMode: json.data.expensesSpreadMode || 'exact',
          shippingCost: parseFloat(json.data.shippingCost) || 0,
          materialsRate: parseFloat(json.data.materialsRate) || 30,
          validOrderStatuses: json.data.validOrderStatuses || ['completed', 'processing'],
          manualShippingPerItem: json.data.manualShippingPerItem ?? false,
          chargeShippingOnFreeOrders: json.data.chargeShippingOnFreeOrders ?? true,
          freeShippingMethods: json.data.freeShippingMethods || ['local_pickup'],
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentBusiness?.id) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          ...settings,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          wooUrl: settings.wooUrl,
          consumerKey: settings.consumerKey,
          consumerSecret: settings.consumerSecret,
          businessId: currentBusiness?.id,
        }),
      });

      const json = await res.json();
      
      if (res.ok) {
        setTestResult({
          success: true,
          message: `חיבור הצליח! ${json.message}`,
        });
      } else {
        setTestResult({
          success: false,
          message: json.error || 'שגיאה בחיבור',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'שגיאה בבדיקת החיבור',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'woocommerce' as TabType, label: 'WooCommerce', icon: Store, color: 'purple' },
    { id: 'business' as TabType, label: 'פרמטרים', icon: Calculator, color: 'green' },
    { id: 'products' as TabType, label: 'מוצרים', icon: Package, color: 'orange' },
    { id: 'integrations' as TabType, label: 'אינטגרציות', icon: Link2, color: 'blue' },
    { id: 'webhook' as TabType, label: 'Webhook', icon: Webhook, color: 'emerald' },
  ];

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">הגדרות {currentBusiness?.name}</h1>
              <p className="text-gray-300">ניהול חיבורים, פרמטרים עסקיים ועלויות מוצרים</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                    isActive
                      ? `border-${tab.color}-600 text-${tab.color}-600 bg-${tab.color}-50`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={isActive ? {
                    borderColor: tab.color === 'purple' ? '#9333ea' : tab.color === 'green' ? '#16a34a' : tab.color === 'emerald' ? '#059669' : '#ea580c',
                    color: tab.color === 'purple' ? '#9333ea' : tab.color === 'green' ? '#16a34a' : tab.color === 'emerald' ? '#059669' : '#ea580c',
                    backgroundColor: tab.color === 'purple' ? '#faf5ff' : tab.color === 'green' ? '#f0fdf4' : tab.color === 'emerald' ? '#ecfdf5' : '#fff7ed',
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* WooCommerce Tab */}
          {activeTab === 'woocommerce' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <Store className="w-10 h-10 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900">חיבור לחנות WooCommerce</h3>
                  <p className="text-purple-700 text-sm">הזן את פרטי ה-API כדי לסנכרן הזמנות אוטומטית</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כתובת החנות
                  </label>
                  <input
                    type="url"
                    value={settings.wooUrl}
                    onChange={(e) => setSettings({ ...settings, wooUrl: e.target.value })}
                    placeholder="https://your-store.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consumer Key
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.consumerKey ? 'text' : 'password'}
                        value={settings.consumerKey}
                        onChange={(e) => setSettings({ ...settings, consumerKey: e.target.value })}
                        placeholder="ck_xxxx..."
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, consumerKey: !showSecrets.consumerKey })}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets.consumerKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consumer Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.consumerSecret ? 'text' : 'password'}
                        value={settings.consumerSecret}
                        onChange={(e) => setSettings({ ...settings, consumerSecret: e.target.value })}
                        placeholder="cs_xxxx..."
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, consumerSecret: !showSecrets.consumerSecret })}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets.consumerSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={handleTest}
                    disabled={testing || !settings.wooUrl || !settings.consumerKey || !settings.consumerSecret}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <TestTube className="w-5 h-5" />
                    )}
                    <span>בדיקת חיבור</span>
                  </button>

                  {testResult && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {testResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Help Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800 mb-2">איך להשיג את מפתחות ה-API?</h3>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>היכנס לפאנל הניהול של WooCommerce</li>
                      <li>לך ל-WooCommerce → הגדרות → מתקדם → REST API</li>
                      <li>לחץ על "הוסף מפתח"</li>
                      <li>בחר הרשאות "קריאה" ולחץ על "צור מפתח API"</li>
                      <li>העתק את ה-Consumer Key וה-Consumer Secret</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Order Statuses Selection */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
                  <ListChecks className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-indigo-900">סטטוסי הזמנות להכללה</h3>
                    <p className="text-indigo-700 text-sm">בחר אילו סטטוסי הזמנות יכללו בחישוב ההכנסות</p>
                  </div>
                </div>

                {currentBusiness?.id && settings.wooUrl && (
                  <OrderStatusSelector
                    businessId={currentBusiness.id}
                    selectedStatuses={settings.validOrderStatuses}
                    onChange={(statuses) => setSettings({ ...settings, validOrderStatuses: statuses })}
                  />
                )}

                {(!settings.wooUrl || !settings.consumerKey) && (
                  <p className="text-gray-500 text-sm">הזן פרטי חיבור WooCommerce כדי לראות את רשימת הסטטוסים</p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    saved
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : saved ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{saved ? 'נשמר!' : 'שמור הגדרות'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Business Settings Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <Calculator className="w-10 h-10 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900">פרמטרים עסקיים</h3>
                  <p className="text-green-700 text-sm">הגדרת אחוזי מיסים, עלויות ועמלות לחישוב רווחיות</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    מע"מ
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.vatRate}
                      onChange={(e) => setSettings({ ...settings, vatRate: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-semibold"
                    />
                    <span className="text-gray-500 text-lg">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">אחוז המע"מ הסטנדרטי בישראל</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    עמלת אשראי
                  </label>
                  <div className="mb-3">
                    <select
                      value={settings.creditFeeMode}
                      onChange={(e) => setSettings({ ...settings, creditFeeMode: e.target.value as 'percentage' | 'manual' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      <option value="percentage">אחוז מההכנסה (אוטומטי)</option>
                      <option value="manual">מילוי ידני בטבלה</option>
                    </select>
                  </div>
                  {settings.creditFeeMode === 'percentage' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={settings.creditCardRate}
                        onChange={(e) => setSettings({ ...settings, creditCardRate: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-semibold"
                      />
                      <span className="text-gray-500 text-lg">%</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {settings.creditFeeMode === 'percentage' 
                      ? 'יחושב אוטומטית מסך ההכנסה' 
                      : 'תוכל לערוך ידנית בטבלת התזרים'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    פריסת הוצאות וזיכויים
                  </label>
                  <select
                    value={settings.expensesSpreadMode}
                    onChange={(e) => setSettings({ ...settings, expensesSpreadMode: e.target.value as 'exact' | 'spread' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="exact">לפי תאריך מדויק</option>
                    <option value="spread">פריסה על כל החודש</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {settings.expensesSpreadMode === 'exact' 
                      ? 'הוצאות וזיכויים יופיעו בתאריך שהוזנו' 
                      : 'הוצאות וזיכויים יתחלקו שווה בכל ימי החודש'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    עלות משלוח בפועל
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={settings.shippingCost}
                      onChange={(e) => setSettings({ ...settings, shippingCost: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-semibold"
                    />
                    <span className="text-gray-500 text-lg">₪</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">0 = לפי מחיר ללקוח</p>
                  
                  {/* Charge on free shipping orders */}
                  {settings.shippingCost > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">חייב גם על "משלוח חינם"</p>
                          <p className="text-xs text-gray-500">חשב עלות משלוח גם כשהלקוח קיבל משלוח חינם</p>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, chargeShippingOnFreeOrders: !settings.chargeShippingOnFreeOrders })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            settings.chargeShippingOnFreeOrders ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              settings.chargeShippingOnFreeOrders ? 'right-0.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Shipping per Item Toggle */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">מילוי עלות משלוח ידנית לכל מוצר</h4>
                      <p className="text-sm text-gray-600">
                        {settings.manualShippingPerItem 
                          ? 'עלות משלוח תמולא ידנית לכל מוצר בפופאפ ההזמנות'
                          : 'עלות משלוח נמשכת אוטומטית מהאתר (shipping_total)'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, manualShippingPerItem: !settings.manualShippingPerItem })}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.manualShippingPerItem ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow ${
                        settings.manualShippingPerItem ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {settings.manualShippingPerItem && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-700">
                      💡 כשאפשרות זו מופעלת, בפופאפ ההזמנות יופיע שדה "עלות משלוח" ליד כל מוצר. 
                      העלות תישמר יחד עם עלות המוצר.
                    </p>
                  </div>
                )}
              </div>

              {/* Free Shipping Methods (no cost) */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">שיטות משלוח ללא עלות (איסוף עצמי וכו')</h4>
                    <p className="text-sm text-gray-600">הזמנות עם שיטות אלו לא יחושבו כהוצאת משלוח</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {settings.freeShippingMethods.map((method, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm"
                      >
                        {method}
                        <button
                          onClick={() => {
                            const newMethods = settings.freeShippingMethods.filter((_, i) => i !== index);
                            setSettings({ ...settings, freeShippingMethods: newMethods });
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="הוסף שיטת משלוח (לדוגמה: local_pickup)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim().toLowerCase();
                          if (value && !settings.freeShippingMethods.includes(value)) {
                            setSettings({
                              ...settings,
                              freeShippingMethods: [...settings.freeShippingMethods, value]
                            });
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    💡 שיטות נפוצות: local_pickup, pickup_location, store_pickup
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    saved
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : saved ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{saved ? 'נשמר!' : 'שמור הגדרות'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Product Costs Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                <Package className="w-10 h-10 text-orange-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-900">עלויות מוצרים</h3>
                  <p className="text-orange-700 text-sm">ניהול עלויות ברירת מחדל לכל מוצר - נשמרות אוטומטית מהזמנות</p>
                </div>
              </div>

              <ProductCostsManager businessId={currentBusiness?.id} />
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <IntegrationsTab businessId={currentBusiness?.id} />
          )}

          {/* Webhook Tab */}
          {activeTab === 'webhook' && (
            <WebhookSetupTab />
          )}
        </div>
      </div>
    </div>
  );
}

// Webhook Setup Tab Component
function WebhookSetupTab() {
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/woocommerce`);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
        <Webhook className="w-10 h-10 text-emerald-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-emerald-900">הגדרת Webhook לעדכונים בזמן אמת</h3>
          <p className="text-emerald-700 text-sm">קבל התראות אוטומטיות על כל שינוי בהזמנות</p>
        </div>
      </div>

      {/* What is Webhook */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">מה זה Webhook?</p>
          <p>Webhook מאפשר ל-WooCommerce לשלוח הודעה למערכת שלך בכל פעם שיש שינוי בהזמנה. 
             כך תקבל התראה על הזמנות חדשות, שינויי סטטוס, עדכון סכומים ועוד - הכל בזמן אמת!</p>
        </div>
      </div>

      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          כתובת ה-Webhook שלך:
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg font-mono text-sm break-all min-h-[48px]">
            {webhookUrl || <span className="text-gray-400">טוען...</span>}
          </div>
          <button
            onClick={handleCopy}
            disabled={!webhookUrl}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            } disabled:opacity-50`}
          >
            {copied ? <Check className="w-5 h-5" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            <span>{copied ? 'הועתק!' : 'העתק'}</span>
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">הוראות הגדרה ב-WooCommerce:</h3>
        
        <ol className="space-y-4 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <div className="pt-0.5">
              <p>היכנס לפאנל הניהול של WordPress</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <div className="pt-0.5">
              <p>לך ל-<strong>WooCommerce → הגדרות → מתקדם → Webhooks</strong></p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <div className="pt-0.5">
              <p>לחץ על <strong>"הוסף webhook"</strong></p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <div className="pt-0.5">
              <p>מלא את הפרטים הבאים:</p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-32">שם:</span>
                  <code className="px-2 py-1 bg-white rounded border text-emerald-700">CRM Order Sync</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-32">סטטוס:</span>
                  <code className="px-2 py-1 bg-green-100 rounded border border-green-200 text-green-700">פעיל</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-32">נושא (Topic):</span>
                  <code className="px-2 py-1 bg-white rounded border text-emerald-700">Order updated</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-600 w-32 pt-1">כתובת URL:</span>
                  <code className="px-2 py-1 bg-white rounded border text-emerald-700 text-xs break-all">{webhookUrl}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600 w-32">API Version:</span>
                  <code className="px-2 py-1 bg-white rounded border text-emerald-700">WP REST API v3</code>
                </div>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <div className="pt-0.5">
              <p>לחץ על <strong>"שמור webhook"</strong></p>
            </div>
          </li>
        </ol>
      </div>

      {/* Recommended Webhooks */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-sm text-emerald-800 font-medium mb-3">
          ✅ מומלץ ליצור 3 webhooks (כולם עם אותה כתובת URL):
        </p>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <p className="font-medium text-gray-800">Order created</p>
              <p className="text-xs text-gray-500">התראה על הזמנה חדשה</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <p className="font-medium text-gray-800">Order updated</p>
              <p className="text-xs text-gray-500">התראה על שינוי בהזמנה (סטטוס, סכום, פריטים)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <p className="font-medium text-gray-800">Order deleted</p>
              <p className="text-xs text-gray-500">התראה על מחיקת הזמנה</p>
            </div>
          </div>
        </div>
      </div>

      {/* What changes are tracked */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-800 font-medium mb-2">
          🔔 המערכת תתריע לך על השינויים הבאים:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            שינוי סטטוס
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            שינוי סכום
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            שינוי פריטים
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            שינוי משלוח
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            שינוי לקוח
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            הערות חדשות
          </div>
        </div>
      </div>

      {/* Supported statuses */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-800 font-medium mb-2">
          📊 סטטוסים שנספרים כהכנסה בתזרים:
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">✓ Completed</span>
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">✓ Processing</span>
          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">✓ On-hold</span>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 הזמנות עם סטטוס Cancelled, Refunded, Failed או Pending לא נספרות כהכנסה
        </p>
      </div>
    </div>
  );
}

// Integrations Tab Component - All external connections
function IntegrationsTab({ businessId }: { businessId?: string }) {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gaConnected, setGaConnected] = useState(false);
  const [gaPropertyName, setGaPropertyName] = useState<string | null>(null);
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  
  // GA Property selection
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [gaProperties, setGaProperties] = useState<Array<{id: string; displayName: string; accountName: string}>>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);

  useEffect(() => {
    if (businessId) {
      checkConnectionStatus();
      
      // Check URL params for property selection prompt
      const params = new URLSearchParams(window.location.search);
      if (params.get('ga_select_property') === 'true') {
        loadGaProperties();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [businessId]);

  const checkConnectionStatus = async () => {
    setLoading(true);
    try {
      // Check Gmail status
      const gmailRes = await fetch(`/api/gmail/status?businessId=${businessId}`);
      const gmailData = await gmailRes.json();
      setGmailConnected(gmailData.connected);

      // Check Google Ads status
      const settingsRes = await fetch(`/api/business-settings?businessId=${businessId}`);
      const settingsData = await settingsRes.json();
      if (settingsData.data?.googleAdsRefreshToken) {
        setGoogleAdsConnected(true);
      }

      // Check GA4 status - check integrations table
      const gaRes = await fetch(`/api/analytics/status?businessId=${businessId}`);
      const gaData = await gaRes.json();
      setGaConnected(gaData.connected);
      if (gaData.propertyName) {
        setGaPropertyName(gaData.propertyName);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGaProperties = async () => {
    setLoadingProperties(true);
    setShowPropertySelector(true);
    try {
      const res = await fetch(`/api/analytics/properties?businessId=${businessId}`);
      const data = await res.json();
      if (data.properties) {
        setGaProperties(data.properties);
      }
    } catch (error) {
      console.error('Error loading GA properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSelectProperty = async (propertyId: string, propertyName: string) => {
    setSavingProperty(true);
    try {
      const res = await fetch('/api/analytics/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          propertyId,
          propertyName,
        }),
      });
      
      if (res.ok) {
        setGaConnected(true);
        setGaPropertyName(propertyName);
        setShowPropertySelector(false);
      }
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setSavingProperty(false);
    }
  };

  const handleConnect = async (service: string) => {
    setConnecting(service);
    try {
      let authUrl = '';
      
      switch (service) {
        case 'gmail':
          const gmailRes = await fetch(`/api/gmail/auth?businessId=${businessId}`);
          const gmailData = await gmailRes.json();
          authUrl = gmailData.authUrl;
          break;
        case 'ga4':
          const gaRes = await fetch(`/api/analytics/auth?businessId=${businessId}`);
          const gaData = await gaRes.json();
          authUrl = gaData.authUrl;
          break;
        case 'googleads':
          const adsRes = await fetch(`/api/google-ads/auth?businessId=${businessId}`);
          const adsData = await adsRes.json();
          authUrl = adsData.authUrl;
          break;
      }
      
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error(`Error connecting ${service}:`, error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (service: string) => {
    if (!businessId) return;
    
    try {
      console.log(`Disconnecting ${service}`);
      
      if (service === 'ga4') {
        // Delete GA4 integration
        const { error } = await supabase
          .from('integrations')
          .delete()
          .eq('business_id', businessId)
          .eq('type', 'google_analytics');
        
        if (error) throw error;
        
        setGaConnected(false);
        setGaPropertyName(null);
        alert('Google Analytics נותק בהצלחה');
      } else if (service === 'gmail') {
        // Delete Gmail integration
        const { error } = await supabase
          .from('integrations')
          .delete()
          .eq('business_id', businessId)
          .eq('type', 'gmail');
        
        if (error) throw error;
        
        setGmailConnected(false);
        alert('Gmail נותק בהצלחה');
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      alert('שגיאה בניתוק: ' + error.message);
    }
  };

  const integrations = [
    {
      id: 'gmail',
      name: 'Gmail - סריקת חשבוניות',
      description: 'סריקה אוטומטית של חשבוניות ספקים מהמייל',
      icon: Mail,
      color: 'red',
      connected: gmailConnected,
    },
    {
      id: 'ga4',
      name: 'Google Analytics 4',
      description: gaPropertyName ? `מחובר ל: ${gaPropertyName}` : 'ניתוח תנועה והמרות לפי מקור',
      icon: PieChart,
      color: 'orange',
      connected: gaConnected,
    },
    {
      id: 'googleads',
      name: 'Google Ads',
      description: 'סנכרון אוטומטי של הוצאות פרסום',
      icon: BarChart3,
      color: 'blue',
      connected: googleAdsConnected,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <Link2 className="w-10 h-10 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900">חיבורים ואינטגרציות</h3>
          <p className="text-blue-700 text-sm">חבר שירותים חיצוניים לסנכרון אוטומטי</p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isConnecting = connecting === integration.id;
          
          return (
            <div
              key={integration.id}
              className="flex items-center justify-between p-5 bg-white border rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  integration.color === 'red' ? 'bg-red-100' :
                  integration.color === 'orange' ? 'bg-orange-100' :
                  'bg-blue-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    integration.color === 'red' ? 'text-red-600' :
                    integration.color === 'orange' ? 'text-orange-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {integration.connected ? (
                  <>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <Check className="w-4 h-4" />
                      מחובר
                    </span>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      נתק
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    disabled={isConnecting}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                      integration.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                      integration.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    } text-white disabled:opacity-50`}
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    התחבר
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">איך זה עובד?</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Gmail:</strong> סריקת מיילים עם חשבוניות והעברה אוטומטית להוצאות</li>
              <li><strong>Google Analytics:</strong> ניתוח מקורות תנועה, המרות ו-ROAS לכל ערוץ</li>
              <li><strong>Google Ads:</strong> משיכת הוצאות פרסום אוטומטית לטבלת התזרים</li>
            </ul>
          </div>
        </div>
      </div>

      {/* GA Property Selection Modal */}
      {showPropertySelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">בחר את ה-Property</h3>
              <p className="text-sm text-gray-500 mt-1">בחר את חשבון Google Analytics שברצונך לחבר</p>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : gaProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>לא נמצאו Properties</p>
                  <p className="text-sm mt-1">ודא שיש לך גישה לחשבון Google Analytics</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gaProperties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => handleSelectProperty(property.id, property.displayName)}
                      disabled={savingProperty}
                      className="w-full text-right p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-gray-900">{property.displayName}</div>
                      <div className="text-sm text-gray-500">{property.accountName} · ID: {property.id}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPropertySelector(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Google Ads Setup Tab Component
function GoogleAdsSetupTab({ businessId }: { businessId?: string }) {
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [autoSync, setAutoSync] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'script' | 'api'>('script');
  
  // API Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [connectingApi, setConnectingApi] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncCounts, setSyncCounts] = useState<{ campaigns: number; keywords: number; searchTerms: number; ads: number } | null>(null);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhook/google-ads`
    : '';

  useEffect(() => {
    if (businessId) {
      loadGoogleAdsSettings();
    }
  }, [businessId]);

  const loadGoogleAdsSettings = async () => {
    try {
      const res = await fetch(`/api/business-settings?businessId=${businessId}`);
      const json = await res.json();
      console.log('Google Ads settings loaded:', json.data);
      if (json.data) {
        setWebhookSecret(json.data.googleAdsWebhookSecret || generateSecret());
        setAutoSync(json.data.googleAdsAutoSync ?? false);
        // Check if API is connected (only need refresh token)
        if (json.data.googleAdsRefreshToken) {
          setIsConnected(true);
          setConnectedAccount(json.data.googleAdsCustomerId || 'מחובר');
          setConnectionMethod('api');
          // Load sync status
          loadSyncStatus();
        }
      } else {
        setWebhookSecret(generateSecret());
      }
    } catch (error) {
      console.error('Error loading Google Ads settings:', error);
      setWebhookSecret(generateSecret());
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const res = await fetch(`/api/google-ads/sync?businessId=${businessId}`);
      const json = await res.json();
      if (json.lastSync) {
        setLastSync(json.lastSync);
      }
      if (json.counts) {
        setSyncCounts(json.counts);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const generateSecret = () => {
    return 'gads_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          googleAdsWebhookSecret: webhookSecret,
          googleAdsAutoSync: autoSync,
        }),
      });
    } catch (error) {
      console.error('Error saving Google Ads settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const regenerateSecret = () => {
    setWebhookSecret(generateSecret());
  };

  const handleConnectGoogleAds = () => {
    if (!businessId) return;
    setConnectingApi(true);
    // Redirect to OAuth flow
    window.location.href = `/api/google-ads/auth?businessId=${businessId}`;
  };

  const handleDisconnectGoogleAds = async () => {
    if (!businessId) return;
    if (!confirm('האם אתה בטוח שברצונך לנתק את חשבון Google Ads?')) return;
    
    try {
      await fetch('/api/business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          googleAdsRefreshToken: null,
          googleAdsCustomerId: null,
        }),
      });
      setIsConnected(false);
      setConnectedAccount(null);
      setLastSync(null);
      setSyncCounts(null);
    } catch (error) {
      console.error('Error disconnecting Google Ads:', error);
    }
  };

  const handleSyncNow = async () => {
    if (!businessId || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          // Last 30 days by default
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`סנכרון הושלם בהצלחה!\n\nקמפיינים: ${result.campaigns}\nמודעות: ${result.ads}\nמילות מפתח: ${result.keywords}\nתנאי חיפוש: ${result.searchTerms}`);
        loadSyncStatus();
      } else {
        alert(`שגיאה בסנכרון: ${result.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`שגיאה: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <BarChart3 className="w-10 h-10 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900">חיבור Google Ads</h3>
          <p className="text-blue-700 text-sm">קבל נתוני פרסום אוטומטיים ישירות מגוגל אדס</p>
        </div>
      </div>

      {/* Connection Method Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setConnectionMethod('api')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            connectionMethod === 'api' 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔗 חיבור ישיר (מומלץ)
        </button>
        <button
          onClick={() => setConnectionMethod('script')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            connectionMethod === 'script' 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📜 דרך Script
        </button>
      </div>

      {/* API Connection Method */}
      {connectionMethod === 'api' && (
        <div className="space-y-4">
          {isConnected ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800">מחובר ל-Google Ads</h4>
                  <p className="text-sm text-green-600">חשבון: {connectedAccount}</p>
                </div>
                <button
                  onClick={handleDisconnectGoogleAds}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  נתק חשבון
                </button>
              </div>

              {/* Sync Section */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">סנכרון נתונים</h5>
                    {lastSync && (
                      <p className="text-xs text-gray-500">
                        סנכרון אחרון: {new Date(lastSync).toLocaleString('he-IL')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        מסנכרן...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        סנכרן עכשיו
                      </>
                    )}
                  </button>
                </div>

                {/* Sync Stats */}
                {syncCounts && (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-lg font-semibold text-gray-900">{syncCounts.campaigns}</div>
                      <div className="text-xs text-gray-500">קמפיינים</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-lg font-semibold text-gray-900">{syncCounts.ads}</div>
                      <div className="text-xs text-gray-500">מודעות</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-lg font-semibold text-gray-900">{syncCounts.keywords}</div>
                      <div className="text-xs text-gray-500">מילות מפתח</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-lg font-semibold text-gray-900">{syncCounts.searchTerms}</div>
                      <div className="text-xs text-gray-500">תנאי חיפוש</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ ה-AI יקבל גישה לתוכן המודעות, קהלים ומילות מפתח<br/>
                  💡 לחץ "סנכרן עכשיו" לעדכון הנתונים
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">חבר את חשבון Google Ads שלך</h4>
              <p className="text-sm text-gray-500 mb-4">
                חיבור ישיר מאפשר סנכרון אוטומטי וגישה מלאה לנתונים כולל תוכן מודעות
              </p>
              <button
                onClick={handleConnectGoogleAds}
                disabled={connectingApi}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {connectingApi ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ExternalLink className="w-5 h-5" />
                )}
                התחבר עם Google
              </button>
            </div>
          )}
        </div>
      )}

      {/* Script Method */}
      {connectionMethod === 'script' && (
        <>
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">סנכרון אוטומטי</h4>
              <p className="text-sm text-gray-500">עדכן את עמודת גוגל אדס אוטומטית מהנתונים שמתקבלים</p>
            </div>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSync ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSync ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Setup Instructions */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">הוראות הגדרה:</h4>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                <div>
                  <p className="font-medium text-gray-800">פתח את Google Ads</p>
                  <p className="text-sm text-gray-500">Tools & Settings → Scripts</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <div>
                  <p className="font-medium text-gray-800">צור Script חדש</p>
                  <p className="text-sm text-gray-500">לחץ על + ליצירת script חדש</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                <div>
                  <p className="font-medium text-gray-800">העתק את הקוד</p>
                  <a 
                    href="/google-ads-script.js" 
                    target="_blank"
                    className="text-sm text-blue-600 hover:underline"
                  >
                לחץ כאן להורדת הקוד →
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">4</span>
            <div>
              <p className="font-medium text-gray-800">עדכן את הפרמטרים בקוד:</p>
            </div>
          </div>
        </div>

        {/* Parameters to copy */}
        <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">WEBHOOK_URL:</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white border rounded text-sm break-all">{webhookUrl}</code>
              <button
                onClick={() => handleCopy(webhookUrl, 'url')}
                className={`px-3 py-2 rounded transition-colors ${
                  copied === 'url' ? 'bg-green-100 text-green-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">BUSINESS_ID:</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white border rounded text-sm break-all">{businessId}</code>
              <button
                onClick={() => handleCopy(businessId || '', 'business')}
                className={`px-3 py-2 rounded transition-colors ${
                  copied === 'business' ? 'bg-green-100 text-green-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {copied === 'business' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SECRET_KEY:</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white border rounded text-sm break-all">{webhookSecret}</code>
              <button
                onClick={() => handleCopy(webhookSecret, 'secret')}
                className={`px-3 py-2 rounded transition-colors ${
                  copied === 'secret' ? 'bg-green-100 text-green-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {copied === 'secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={regenerateSecret}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              יצירת מפתח חדש
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">5</span>
          <div>
            <p className="font-medium text-gray-800">הגדר תזמון</p>
            <p className="text-sm text-gray-500">לחץ על ה-Script → Frequency → Daily (מומלץ בשעה 6:00 בבוקר)</p>
          </div>
        </div>
      </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              שמירה
            </button>
          </div>
        </>
      )}
    </div>
  );
}
