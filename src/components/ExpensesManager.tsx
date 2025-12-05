'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Receipt, Globe, Check, X, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface Expense {
  id: number;
  expense_date: string;
  description: string;
  amount: number;
  vat_amount?: number;
  supplier_name?: string;
  is_recurring: boolean;
  category?: string;
}

interface ExpensesManagerProps {
  month: number;
  year: number;
  onUpdate?: () => void;
  onClose?: () => void;
}

export default function ExpensesManager({ month, year, onUpdate, onClose }: ExpensesManagerProps) {
  const [vatExpenses, setVatExpenses] = useState<Expense[]>([]);
  const [noVatExpenses, setNoVatExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vat' | 'noVat'>('vat');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [vatRate, setVatRate] = useState(17); // Default 17%
  const [newExpense, setNewExpense] = useState({
    expense_date: '',
    description: '',
    amount: '',
    supplier_name: '',
    is_recurring: false,
    category: '',
  });

  // Date range for the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  useEffect(() => {
    loadExpenses();
    loadSettings();
  }, [month, year]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.data) {
        const settings = json.data.reduce((acc: any, s: any) => {
          acc[s.key] = s.value;
          return acc;
        }, {});
        if (settings.vatRate) {
          setVatRate(parseFloat(settings.vatRate) || 17);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      setVatExpenses(json.vatExpenses || []);
      setNoVatExpenses(json.noVatExpenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate VAT from total amount (amount includes VAT)
  // Formula: VAT = amount * (vatRate / (100 + vatRate))
  const calculateVatFromTotal = (totalAmount: number): number => {
    return totalAmount * (vatRate / (100 + vatRate));
  };

  const handleAdd = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.expense_date) return;
    
    setSaving(true);
    const amount = parseFloat(newExpense.amount) || 0;
    // Calculate VAT automatically for VAT expenses
    const vatAmount = activeTab === 'vat' ? calculateVatFromTotal(amount) : 0;
    
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab === 'vat' ? 'vat' : 'noVat',
          ...newExpense,
          amount: amount,
          vat_amount: vatAmount,
        }),
      });

      if (res.ok) {
        await loadExpenses();
        setNewExpense({
          expense_date: '',
          description: '',
          amount: '',
          supplier_name: '',
          is_recurring: false,
          category: '',
        });
        setShowAddForm(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, type: 'vat' | 'noVat') => {
    if (!confirm('האם למחוק את ההוצאה?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}&type=${type}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadExpenses();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleCopyFromPreviousMonth = async () => {
    // Calculate previous month
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = year - 1;
    }
    
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    
    if (!confirm(`להעתיק את כל ההוצאות מ-${monthNames[prevMonth]} ${prevYear}?`)) return;
    
    setCopying(true);
    try {
      const res = await fetch('/api/expenses/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMonth: prevMonth,
          fromYear: prevYear,
          toMonth: month,
          toYear: year,
        }),
      });

      const json = await res.json();
      
      if (res.ok) {
        await loadExpenses();
        onUpdate?.();
        alert(`הועתקו ${json.copiedCount || 0} הוצאות בהצלחה!`);
      } else {
        alert(json.error || 'שגיאה בהעתקה');
      }
    } catch (error) {
      console.error('Error copying expenses:', error);
      alert('שגיאה בהעתקה');
    } finally {
      setCopying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    });
  };

  const vatTotal = vatExpenses.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
  const vatVatTotal = vatExpenses.reduce((sum, e) => sum + (parseFloat(String(e.vat_amount)) || 0), 0);
  const noVatTotal = noVatExpenses.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

  const currentExpenses = activeTab === 'vat' ? vatExpenses : noVatExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('vat')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'vat'
              ? 'border-green-600 text-green-600 bg-green-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>מוכר ({vatExpenses.length})</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {formatCurrency(vatTotal)}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('noVat')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'noVat'
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>חו"ל ({noVatExpenses.length})</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {formatCurrency(noVatTotal)}
          </span>
        </button>
      </div>

      {/* Add Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף הוצאה
        </button>
        
        <button
          onClick={handleCopyFromPreviousMonth}
          disabled={copying}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
          title="העתק הוצאות מהחודש הקודם"
        >
          {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          העתק מחודש קודם
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">תאריך</label>
              <input
                type="date"
                value={newExpense.expense_date}
                onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">סכום</label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="₪"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">תיאור</label>
            <input
              type="text"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              placeholder="למה ההוצאה?"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">ספק</label>
            <input
              type="text"
              value={newExpense.supplier_name}
              onChange={(e) => setNewExpense({ ...newExpense, supplier_name: e.target.value })}
              placeholder="שם הספק"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          
          {activeTab === 'vat' && newExpense.amount && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              מע"מ לקיזוז (חישוב אוטומטי {vatRate}%): {formatCurrency(calculateVatFromTotal(parseFloat(newExpense.amount) || 0))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={newExpense.is_recurring}
              onChange={(e) => setNewExpense({ ...newExpense, is_recurring: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="recurring" className="text-sm text-gray-600">הוצאה קבועה (חודשית)</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newExpense.description || !newExpense.amount || !newExpense.expense_date}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              שמור
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {currentExpenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>אין הוצאות לחודש זה</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-gray-600">תאריך</th>
                <th className="px-3 py-2 text-right text-gray-600">תיאור</th>
                <th className="px-3 py-2 text-right text-gray-600">ספק</th>
                <th className="px-3 py-2 text-center text-gray-600">סכום</th>
                {activeTab === 'vat' && <th className="px-3 py-2 text-center text-gray-600">מע"מ</th>}
                <th className="px-3 py-2 text-center text-gray-600 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{formatDate(expense.expense_date)}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{expense.description}</span>
                    {expense.is_recurring && (
                      <span className="mr-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">קבועה</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{expense.supplier_name || '-'}</td>
                  <td className="px-3 py-2 text-center font-medium">{formatCurrency(expense.amount)}</td>
                  {activeTab === 'vat' && (
                    <td className="px-3 py-2 text-center text-green-600">{formatCurrency(expense.vat_amount || 0)}</td>
                  )}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDelete(expense.id, activeTab === 'vat' ? 'vat' : 'noVat')}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-gray-600">סה"כ</td>
                <td className="px-3 py-2 text-center">{formatCurrency(activeTab === 'vat' ? vatTotal : noVatTotal)}</td>
                {activeTab === 'vat' && <td className="px-3 py-2 text-center text-green-600">{formatCurrency(vatVatTotal)}</td>}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">הוצאות מוכרות</p>
          <p className="font-bold text-green-600">{formatCurrency(vatTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">הוצאות חו"ל</p>
          <p className="font-bold text-blue-600">{formatCurrency(noVatTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">מע"מ לקיזוז</p>
          <p className="font-bold text-purple-600">{formatCurrency(vatVatTotal)}</p>
        </div>
      </div>
    </div>
  );
}
