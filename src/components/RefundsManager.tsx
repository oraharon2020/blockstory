'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RotateCcw, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Search,
  Zap,
  Pencil,
  Check,
  X
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
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    refund_date: '',
    description: '',
    amount: '',
    customer_name: '',
  });
  
  // Refs for quick navigation
  const dateRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  
  // New refund form
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

  // Date range for the month (month is 1-12)
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

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

  const handleAddRefund = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      
      // Keep the date for next entry
      const savedDate = newRefund.refund_date;
      setNewRefund({ 
        refund_date: savedDate,
        description: '', 
        amount: '',
        order_id: '',
        customer_name: '',
        reason: ''
      });
      setLastAdded(json.id);
      setTimeout(() => setLastAdded(null), 2000);
      fetchRefunds();
      onUpdate?.();
      // Focus on description for quick next entry
      descRef.current?.focus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Enter key for quick add
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget === amountRef.current) {
        // On Enter in amount field, submit
        handleAddRefund();
      } else if (nextRef?.current) {
        nextRef.current.focus();
      }
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

  // Start editing a refund
  const handleStartEdit = (refund: Refund) => {
    setEditingId(refund.id);
    setEditData({
      refund_date: refund.refund_date,
      description: refund.description,
      amount: String(refund.amount),
      customer_name: refund.customer_name || '',
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ refund_date: '', description: '', amount: '', customer_name: '' });
  };

  // Save edited refund
  const handleSaveEdit = async (id: string) => {
    if (!editData.description || !editData.amount || !editData.refund_date || !currentBusiness?.id) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/refunds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          refund_date: editData.refund_date,
          description: editData.description,
          amount: parseFloat(editData.amount),
          customer_name: editData.customer_name,
          businessId: currentBusiness.id,
        }),
      });

      if (res.ok) {
        fetchRefunds();
        setEditingId(null);
        setEditData({ refund_date: '', description: '', amount: '', customer_name: '' });
        onUpdate?.();
      } else {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update refund');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    <div dir="rtl">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2 mb-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Quick Add Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
              <th className="px-3 py-2.5 text-right w-28">תאריך</th>
              <th className="px-3 py-2.5 text-right">תיאור</th>
              <th className="px-3 py-2.5 text-right w-28">לקוח</th>
              <th className="px-3 py-2.5 text-center w-24">סכום</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {/* Quick Add Row */}
            <tr className="bg-red-50/50 border-b-2 border-red-200">
              <td className="px-2 py-1.5">
                <input
                  ref={dateRef}
                  type="date"
                  value={newRefund.refund_date}
                  onChange={(e) => setNewRefund({ ...newRefund, refund_date: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, descRef)}
                  min={startDate}
                  max={endDate}
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  ref={descRef}
                  type="text"
                  value={newRefund.description}
                  onChange={(e) => setNewRefund({ ...newRefund, description: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, customerRef)}
                  placeholder="תיאור הזיכוי..."
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  ref={customerRef}
                  type="text"
                  value={newRefund.customer_name}
                  onChange={(e) => setNewRefund({ ...newRefund, customer_name: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, amountRef)}
                  placeholder="לקוח"
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  value={newRefund.amount}
                  onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e)}
                  placeholder="₪"
                  className="w-full px-2 py-1.5 border rounded text-sm text-center focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white font-medium"
                />
              </td>
              <td className="px-2 py-1.5">
                <button
                  onClick={() => handleAddRefund()}
                  disabled={saving || !newRefund.description || !newRefund.amount || !newRefund.refund_date}
                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="הוסף (Enter)"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
            </tr>
            
            {/* Hint row */}
            <tr className="bg-gray-50/50 border-b">
              <td colSpan={5} className="px-3 py-1 text-[10px] text-gray-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Tab לעבור בין שדות, Enter להוסיף • התאריך נשמר אוטומטית לזיכוי הבא
              </td>
            </tr>
            
            {/* Refund rows */}
            {refunds.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  <RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">אין זיכויים לחודש זה</p>
                  <p className="text-xs mt-1">הזן את הזיכוי הראשון למעלה</p>
                </td>
              </tr>
            ) : (
              refunds.map((refund, index) => (
                <React.Fragment key={refund.id}>
                  <tr 
                    className={`hover:bg-red-50/50 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    } ${lastAdded === refund.id ? 'bg-green-100 animate-pulse' : ''}`}
                  >
                    {editingId === refund.id ? (
                      <>
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            value={editData.refund_date}
                            onChange={(e) => setEditData({ ...editData, refund_date: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={editData.customer_name}
                            onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={editData.amount}
                            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveEdit(refund.id)}
                              disabled={saving}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {formatDate(refund.refund_date)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium text-gray-900">{refund.description}</span>
                          {refund.order_id && (
                            <span className="mr-2 text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded flex items-center gap-0.5 inline-flex">
                              <Search className="w-2.5 h-2.5" />
                              #{refund.order_id}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {refund.customer_name || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-sm font-semibold text-red-600">
                          {formatCurrency(refund.amount)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleStartEdit(refund)}
                              className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRefund(refund.id)}
                              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  {/* Separator line */}
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="h-[3px] bg-gray-300"></div>
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
        
        {/* Table Footer */}
        {refunds.length > 0 && (
          <div className="bg-red-50 border-t px-4 py-2 flex justify-between items-center text-sm">
            <span className="text-gray-500">{refunds.length} זיכויים</span>
            <span className="font-bold text-red-600">{formatCurrency(totalRefunds)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
