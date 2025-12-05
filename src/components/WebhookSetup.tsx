'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Webhook, ExternalLink, AlertCircle } from 'lucide-react';

interface WebhookSetupProps {
  baseUrl?: string;
}

export default function WebhookSetup({ baseUrl }: WebhookSetupProps) {
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  
  // Set the webhook URL on client side only to avoid hydration mismatch
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden" dir="rtl">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="flex items-center gap-3">
          <Webhook className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">הגדרת Webhook לעדכונים בזמן אמת</h2>
            <p className="text-green-100">קבל עדכונים אוטומטיים על כל הזמנה חדשה</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Alert */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">מה זה Webhook?</p>
            <p>Webhook מאפשר ל-WooCommerce לשלוח הודעה למערכת שלך בכל פעם שיש הזמנה חדשה. 
               כך הנתונים מתעדכנים אוטומטית בזמן אמת, בלי צורך בסנכרון ידני.</p>
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
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              } disabled:opacity-50`}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'הועתק!' : 'העתק'}</span>
            </button>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">הוראות הגדרה ב-WooCommerce:</h3>
          
          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p>היכנס לפאנל הניהול של WordPress</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p>לך ל-<strong>WooCommerce → הגדרות → מתקדם → Webhooks</strong></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p>לחץ על <strong>"הוסף webhook"</strong></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <p>מלא את הפרטים הבאים:</p>
                <ul className="mt-2 mr-4 space-y-1 text-gray-600">
                  <li>• <strong>שם:</strong> CRM Cashflow Sync</li>
                  <li>• <strong>סטטוס:</strong> פעיל</li>
                  <li>• <strong>נושא:</strong> Order created (הזמנה נוצרה)</li>
                  <li>• <strong>כתובת URL למסירה:</strong> הדבק את הכתובת שהעתקת למעלה</li>
                  <li>• <strong>סוד:</strong> (אופציונלי - לאבטחה נוספת)</li>
                </ul>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <p>לחץ על <strong>"שמור webhook"</strong></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <div>
                <p className="text-green-700 font-medium">סיום! מעכשיו כל הזמנה חדשה תעדכן את המערכת אוטומטית</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Additional webhooks recommendation */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium mb-2">
            ✅ מומלץ ליצור 3 webhooks נפרדים:
          </p>
          <ul className="text-sm text-green-700 mr-4 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
              <strong>Order created</strong> - הזמנה חדשה נוצרה
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              <strong>Order updated</strong> - הזמנה עודכנה (שינוי סטטוס, ביטול וכו')
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
              <strong>Order deleted</strong> - הזמנה נמחקה
            </li>
          </ul>
          <p className="text-xs text-green-600 mt-3">
            💡 כל שלושת ה-webhooks משתמשים באותה כתובת URL
          </p>
        </div>

        {/* Supported statuses */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-800 font-medium mb-2">
            📊 סטטוסים שנספרים כהכנסה:
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Processing</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">On-hold</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            הזמנות עם סטטוס Cancelled, Refunded או Failed לא נספרות
          </p>
        </div>
      </div>
    </div>
  );
}
