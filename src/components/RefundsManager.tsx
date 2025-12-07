'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RotateCcw, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Search
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

/**
 * RefundsManager - קומפוננטה לניהול זיכויי לקוחות
 * 
 * מציגה רשימת זיכויים לחודש נבחר
 * מאפשרת הוספה ומחיקה
 * מחשבת סה"כ זיכויים
 */

interface Refund {
  id: string;
  refund_date: string;
  description: string;
  amount: number;
  order_id?: string;
  customer_name?: string;
  reason?: string;
}

interface RefundsManagerProps {
  month: number; // 0-11
  year: number;
  onUpdate?: () => void;
}

export default function RefundsManager({ month, year, onUpdate }: RefundsManagerProps) {
  const { currentBusiness } = useAuth();
  
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New refund form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRefund, setNewRefund] = useState({ 
    refund_date: '',
    description: '', 
    amount: '',
    order_id: '',
    customer_name: '',
    reason: ''
  });
  
  // Totals
  const [totalRefunds, setTotalRefunds] = useState(0);

  // Date range for the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Fetch refunds when month/year/business changes
  useEffect(() => {
    if (currentBusiness?.id) {
      fetchRefunds();
    }
  }, [currentBusiness?.id, month, year]);

  const fetchRefunds = async () => {
    if (!currentBusiness?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ 
        startDate, 
        endDate,
        businessId: currentBusiness.id 
      });
      
      const res = await fetch(`/api/refunds?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch refunds');
      }
      
      const refundsData = json.refunds || [];
      setRefunds(refundsData);
      setTotalRefunds(refundsData.reduce((sum: number, r: Refund) => sum + (r.amount || 0), 0));
    } catch (err: any) {
      console.error('Error fetching refunds:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRefund = async () => {
    if (!newRefund.description || !newRefund.amount || !newRefund.refund_date || !currentBusiness?.id) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          refund_date: newRefund.refund_date,
          description: newRefund.description,
          amount: parseFloat(newRefund.amount),
          order_id: newRefund.order_id || null,
          customer_name: newRefund.customer_name || null,
          reason: newRefund.reason || null,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add refund');
      }
      
      setNewRefund({ 
        refund_date: '',
        description: '', 
        amount: '',
        order_id: '',
        customer_name: '',
        reason: ''
      });
      setShowAddForm(false);
      fetchRefunds();
      onUpdate?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRefund = async (id: string) => {
    if (!confirm('האם למחוק את הזיכוי?')) return;
    
    try {
      const params = new URLSearchParams({ id });
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      
      const res = await fetch(`/api/refunds?${params.toString()}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete refund');
      }
      
      fetchRefunds();
      onUpdate?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    });
  };

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
        <span className="mr-2 text-gray-500">טוען זיכויים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <RotateCcw className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">זיכויי לקוחות</h3>
            <p className="text-sm text-gray-500">
              {monthNames[month]} {year}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            הוסף זיכוי
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-800 mb-3">זיכוי חדש</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">תאריך *</label>
              <input
                type="date"
                value={newRefund.refund_date}
                onChange={(e) => setNewRefund({ ...newRefund, refund_date: e.target.value })}
                min={startDate}
                max={endDate}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">סכום *</label>
              <input
                type="number"
                step="0.01"
                placeholder="סכום הזיכוי"
                value={newRefund.amount}
                onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">תיאור *</label>
              <input
                type="text"
                placeholder="תיאור הזיכוי"
                value={newRefund.description}
                onChange={(e) => setNewRefund({ ...newRefund, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">מספר הזמנה</label>
              <input
                type="text"
                placeholder="מספר הזמנה (אופציונלי)"
                value={newRefund.order_id}
                onChange={(e) => setNewRefund({ ...newRefund, order_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם לקוח</label>
              <input
                type="text"
                placeholder="שם הלקוח (אופציונלי)"
                value={newRefund.customer_name}
                onChange={(e) => setNewRefund({ ...newRefund, customer_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">סיבת הזיכוי</label>
              <input
                type="text"
                placeholder="סיבה (אופציונלי)"
                value={newRefund.reason}
                onChange={(e) => setNewRefund({ ...newRefund, reason: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAddRefund}
              disabled={saving || !newRefund.description || !newRefund.amount || !newRefund.refund_date}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              הוסף
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Refunds List */}
      {refunds.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <RotateCcw className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>אין זיכויים לחודש זה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {refunds.map((refund) => (
            <div
              key={refund.id}
              className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-800">{refund.description}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(refund.refund_date)}</span>
                    {refund.customer_name && (
                      <>
                        <span>•</span>
                        <span>{refund.customer_name}</span>
                      </>
                    )}
                    {refund.order_id && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          #{refund.order_id}
                        </span>
                      </>
                    )}
                    {refund.reason && (
                      <>
                        <span>•</span>
                        <span className="text-red-500">{refund.reason}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-bold text-red-600">
                  {formatCurrency(refund.amount)}
                </span>
                <button
                  onClick={() => handleDeleteRefund(refund.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="מחק זיכוי"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-red-600" />
          <span className="font-semibold text-gray-800">סה"כ זיכויים</span>
        </div>
        <span className="text-xl font-bold text-red-600">{formatCurrency(totalRefunds)}</span>
      </div>
    </div>
  );
}
