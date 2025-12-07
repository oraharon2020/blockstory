'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Eye, EyeOff, TestTube, Check, X, Store, Calculator, Package, HelpCircle, ListChecks, Truck } from 'lucide-react';
import ProductCostsManager from './ProductCostsManager';
import OrderStatusSelector from './OrderStatusSelector';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsFormData {
  wooUrl: string;
  consumerKey: string;
  consumerSecret: string;
  vatRate: number;
  creditCardRate: number;
  shippingCost: number;
  materialsRate: number;
  validOrderStatuses: string[];
  manualShippingPerItem: boolean;
  chargeShippingOnFreeOrders: boolean;
  freeShippingMethods: string[];
}

type TabType = 'woocommerce' | 'business' | 'products';

export default function SettingsPage() {
  const { currentBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('woocommerce');
  const [settings, setSettings] = useState<SettingsFormData>({
    wooUrl: '',
    consumerKey: '',
    consumerSecret: '',
    vatRate: 18,
    creditCardRate: 2.5,
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
    { id: 'woocommerce' as TabType, label: 'חיבור WooCommerce', icon: Store, color: 'purple' },
    { id: 'business' as TabType, label: 'פרמטרים עסקיים', icon: Calculator, color: 'green' },
    { id: 'products' as TabType, label: 'עלויות מוצרים', icon: Package, color: 'orange' },
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
                    borderColor: tab.color === 'purple' ? '#9333ea' : tab.color === 'green' ? '#16a34a' : '#ea580c',
                    color: tab.color === 'purple' ? '#9333ea' : tab.color === 'green' ? '#16a34a' : '#ea580c',
                    backgroundColor: tab.color === 'purple' ? '#faf5ff' : tab.color === 'green' ? '#f0fdf4' : '#fff7ed',
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
                  <p className="text-xs text-gray-500 mt-2">עמלה שגובה חברת האשראי</p>
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
        </div>
      </div>
    </div>
  );
}
