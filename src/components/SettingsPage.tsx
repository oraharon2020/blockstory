'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Eye, EyeOff, TestTube, Check, X } from 'lucide-react';

interface SettingsFormData {
  wooUrl: string;
  consumerKey: string;
  consumerSecret: string;
  vatRate: number;
  materialsRate: number;
  creditCardRate: number;
  shippingCost: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsFormData>({
    wooUrl: '',
    consumerKey: '',
    consumerSecret: '',
    vatRate: 17,
    materialsRate: 30,
    creditCardRate: 2.5,
    shippingCost: 0,
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.data) {
        setSettings({
          wooUrl: json.data.wooUrl || '',
          consumerKey: json.data.consumerKey || '',
          consumerSecret: json.data.consumerSecret || '',
          vatRate: parseFloat(json.data.vatRate) || 17,
          materialsRate: parseFloat(json.data.materialsRate) || 30,
          creditCardRate: parseFloat(json.data.creditCardRate) || 2.5,
          shippingCost: parseFloat(json.data.shippingCost) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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
          materialsRate: settings.materialsRate / 100,
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

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">הגדרות API</h1>
              <p className="text-gray-300">הגדרת חיבור ל-WooCommerce ופרמטרים עסקיים</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* WooCommerce Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">W</span>
              </span>
              הגדרות WooCommerce
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כתובת החנות
              </label>
              <input
                type="url"
                value={settings.wooUrl}
                onChange={(e) => setSettings({ ...settings, wooUrl: e.target.value })}
                placeholder="https://your-store.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Key
              </label>
              <div className="relative">
                <input
                  type={showSecrets.consumerKey ? 'text' : 'password'}
                  value={settings.consumerKey}
                  onChange={(e) => setSettings({ ...settings, consumerKey: e.target.value })}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Test Connection Button */}
            <button
              onClick={handleTest}
              disabled={testing || !settings.wooUrl || !settings.consumerKey || !settings.consumerSecret}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TestTube className="w-5 h-5" />
              )}
              <span>בדיקת חיבור</span>
            </button>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {testResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Business Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">₪</span>
              </span>
              פרמטרים עסקיים
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מע"מ (%)
                </label>
                <input
                  type="number"
                  value={settings.vatRate}
                  onChange={(e) => setSettings({ ...settings, vatRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  עלות חומרי גלם (%)
                </label>
                <input
                  type="number"
                  value={settings.materialsRate}
                  onChange={(e) => setSettings({ ...settings, materialsRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  עמלת אשראי (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.creditCardRate}
                  onChange={(e) => setSettings({ ...settings, creditCardRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                עלות משלוח בפועל (₪ להזמנה)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.shippingCost}
                onChange={(e) => setSettings({ ...settings, shippingCost: parseFloat(e.target.value) || 0 })}
                placeholder="השאר 0 לחישוב לפי מחיר ללקוח"
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">אם תשאיר 0, יחושב לפי מחיר המשלוח שהלקוח שילם</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">איך להשיג את מפתחות ה-API?</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>היכנס לפאנל הניהול של WooCommerce</li>
              <li>לך ל-WooCommerce → הגדרות → מתקדם → REST API</li>
              <li>לחץ על "הוסף מפתח"</li>
              <li>בחר הרשאות "קריאה" ולחץ על "צור מפתח API"</li>
              <li>העתק את ה-Consumer Key וה-Consumer Secret</li>
            </ol>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
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
      </div>
    </div>
  );
}
