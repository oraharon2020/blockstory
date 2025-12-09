'use client';

import React, { useState, useEffect, useRef, KeyboardEvent, useMemo, useCallback } from 'react';
import { Plus, Trash2, Loader2, Receipt, Globe, Copy, Users, RotateCcw, Pencil, Check, X, Pin, PinOff, Search, Maximize2, Minimize2 } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import EmployeesManager from './EmployeesManager';
import RefundsManager from './RefundsManager';
import { useAuth } from '@/contexts/AuthContext';

interface Expense {
  id: number;
  expense_date: string;
  description: string;
  amount: number;
  vat_amount?: number;
  supplier_name?: string;
  is_recurring: boolean;
  category?: string;
  payment_method?: 'credit' | 'bank_transfer' | 'check';
  invoice_number?: string;
}

interface ExpensesManagerProps {
  month: number;
  year: number;
  onUpdate?: () => void;
  onClose?: () => void;
}

export default function ExpensesManager({ month, year, onUpdate, onClose }: ExpensesManagerProps) {
  const { currentBusiness } = useAuth();
  const [vatExpenses, setVatExpenses] = useState<Expense[]>([]);
  const [noVatExpenses, setNoVatExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vat' | 'noVat' | 'employees' | 'refunds'>('vat');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [vatRate, setVatRate] = useState(18);
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  
  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    expense_date: '',
    description: '',
    amount: '',
    supplier_name: '',
    payment_method: 'credit' as 'credit' | 'bank_transfer' | 'check',
    invoice_number: '',
  });
  
  // Refs for quick navigation
  const dateRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  
  const [newExpense, setNewExpense] = useState({
    expense_date: '',
    description: '',
    amount: '',
    supplier_name: '',
    is_recurring: false,
    category: '',
    payment_method: 'credit' as 'credit' | 'bank_transfer' | 'check',
    invoice_number: '',
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
      const params = new URLSearchParams();
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      const res = await fetch(`/api/settings?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        // json.data is already an object with key-value pairs
        const settings = json.data;
        if (settings.vatRate) {
          setVatRate(parseFloat(settings.vatRate) || 18);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      const res = await fetch(`/api/expenses?${params.toString()}`);
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

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
          payment_method: newExpense.payment_method,
          businessId: currentBusiness?.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        await loadExpenses();
        // Keep the date for next entry (common pattern)
        const savedDate = newExpense.expense_date;
        setNewExpense({
          expense_date: savedDate,
          description: '',
          amount: '',
          supplier_name: '',
          is_recurring: false,
          category: '',
          payment_method: 'credit',
          invoice_number: '',
        });
        setLastAdded(result.id);
        setTimeout(() => setLastAdded(null), 2000);
        onUpdate?.();
        // Focus on description for quick next entry
        descRef.current?.focus();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
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
        handleAdd();
      } else if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  const handleDelete = async (id: number, type: 'vat' | 'noVat') => {
    if (!confirm('האם למחוק את ההוצאה?')) return;

    try {
      const params = new URLSearchParams({ id: String(id), type });
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      const res = await fetch(`/api/expenses?${params.toString()}`, {
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

  // Start editing an expense
  const handleStartEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditData({
      expense_date: expense.expense_date,
      description: expense.description,
      amount: String(expense.amount),
      supplier_name: expense.supplier_name || '',
      payment_method: expense.payment_method || 'credit',
      invoice_number: expense.invoice_number || '',
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ expense_date: '', description: '', amount: '', supplier_name: '', payment_method: 'credit', invoice_number: '' });
  };

  // Save edited expense
  const handleSaveEdit = async (id: number, type: 'vat' | 'noVat') => {
    if (!editData.description || !editData.amount || !editData.expense_date) return;
    
    setSaving(true);
    const amount = parseFloat(editData.amount) || 0;
    const vatAmount = type === 'vat' ? calculateVatFromTotal(amount) : 0;
    
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          expense_date: editData.expense_date,
          description: editData.description,
          amount: amount,
          vat_amount: vatAmount,
          supplier_name: editData.supplier_name,
          payment_method: editData.payment_method,
          invoice_number: editData.invoice_number,
          businessId: currentBusiness?.id,
        }),
      });

      if (res.ok) {
        await loadExpenses();
        setEditingId(null);
        setEditData({ expense_date: '', description: '', amount: '', supplier_name: '', payment_method: 'credit', invoice_number: '' });
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle highlight on double-click
  const handleDoubleClick = useCallback((id: number) => {
    setHighlightedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    setHighlightedIds(new Set());
  }, []);

  // Toggle recurring status
  const handleToggleRecurring = async (id: number, type: 'vat' | 'noVat', isRecurring: boolean) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          is_recurring: isRecurring,
          businessId: currentBusiness?.id,
        }),
      });

      if (res.ok) {
        await loadExpenses();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error toggling recurring:', error);
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
          businessId: currentBusiness?.id,
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

  // Sort and filter expenses: recurring (pinned) first, then by date descending, with search
  const sortedExpenses = useMemo(() => {
    const expenses = activeTab === 'vat' ? vatExpenses : noVatExpenses;
    
    // Filter by search query
    const filtered = searchQuery 
      ? expenses.filter(e => 
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(e.amount).includes(searchQuery)
        )
      : expenses;
    
    return [...filtered].sort((a, b) => {
      // Recurring expenses first
      if (a.is_recurring && !b.is_recurring) return -1;
      if (!a.is_recurring && b.is_recurring) return 1;
      // Then by date descending
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
    });
  }, [activeTab, vatExpenses, noVatExpenses, searchQuery]);

  const currentExpenses = sortedExpenses;
  const recurringCount = currentExpenses.filter(e => e.is_recurring).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Compact Header with Tabs */}
      <div className="flex items-center justify-between border-b bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('vat')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'vat'
                ? 'border-green-500 text-green-600 bg-green-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              מוכרות
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                {vatExpenses.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('noVat')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'noVat'
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              חו"ל
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                {noVatExpenses.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'employees'
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              עובדים
            </span>
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'refunds'
                ? 'border-red-500 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              זיכויים
            </span>
          </button>
        </div>
        
        {/* Summary in header */}
        <div className="flex items-center gap-3 px-4 text-sm">
          <span className="text-green-600 font-semibold">{formatCurrency(vatTotal)}</span>
          <span className="text-gray-300">|</span>
          <span className="text-blue-600 font-semibold">{formatCurrency(noVatTotal)}</span>
          {(activeTab === 'vat' || activeTab === 'noVat') && (
            <>
              <button
                onClick={handleCopyFromPreviousMonth}
                disabled={copying}
                className="flex items-center gap-1 px-2 py-1 text-purple-600 hover:bg-purple-50 rounded text-xs"
                title="העתק מחודש קודם"
              >
                {copying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                title={isExpanded ? 'הקטן' : 'הגדל'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search bar - only for expenses tabs */}
      {(activeTab === 'vat' || activeTab === 'noVat') && (
        <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש..."
              className="w-full pr-8 pl-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          {highlightedIds.size > 0 && (
            <button
              onClick={clearHighlights}
              className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded"
            >
              נקה סימונים ({highlightedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'employees' ? (
          <div className="p-4">
            <EmployeesManager month={month} year={year} />
          </div>
        ) : activeTab === 'refunds' ? (
          <div className="p-4">
            <RefundsManager month={month} year={year} onUpdate={onUpdate} />
          </div>
        ) : (
          <div className="p-3">
            {/* Quick Add - Excel-like inline form in table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                    <th className="px-2 py-2.5 w-8"></th>
                    <th className="px-2 py-2.5 text-right w-24">תאריך</th>
                    <th className="px-2 py-2.5 text-right">תיאור</th>
                    <th className="px-2 py-2.5 text-right w-24">ספק</th>
                    <th className="px-2 py-2.5 text-center w-20">חשבונית</th>
                    <th className="px-2 py-2.5 text-center w-20">סכום</th>
                    <th className="px-2 py-2.5 text-center w-20">תשלום</th>
                    {activeTab === 'vat' && <th className="px-2 py-2.5 text-center w-16">מע"מ</th>}
                    <th className="px-2 py-2.5 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Quick Add Row - Always at top */}
                  <tr className="bg-blue-50/50 border-b-2 border-blue-200">
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => setNewExpense({ ...newExpense, is_recurring: !newExpense.is_recurring })}
                        className={`p-1 rounded transition-colors ${newExpense.is_recurring ? 'text-purple-600 bg-purple-100' : 'text-gray-300 hover:text-purple-400'}`}
                        title={newExpense.is_recurring ? 'הסר הצמדה' : 'הצמד כהוצאה קבועה'}
                      >
                        {newExpense.is_recurring ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        ref={dateRef}
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, descRef)}
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        ref={descRef}
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, supplierRef)}
                        placeholder="תיאור ההוצאה..."
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        ref={supplierRef}
                        type="text"
                        value={newExpense.supplier_name}
                        onChange={(e) => setNewExpense({ ...newExpense, supplier_name: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, invoiceRef)}
                        placeholder="ספק"
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        ref={invoiceRef}
                        type="text"
                        value={newExpense.invoice_number}
                        onChange={(e) => setNewExpense({ ...newExpense, invoice_number: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, amountRef)}
                        placeholder="#"
                        className="w-full px-2 py-1.5 border rounded text-sm text-center focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        ref={amountRef}
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e)}
                        placeholder="₪"
                        className="w-full px-2 py-1.5 border rounded text-sm text-center focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white font-medium"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={newExpense.payment_method}
                        onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value as 'credit' | 'bank_transfer' | 'check' })}
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      >
                        <option value="credit">אשראי</option>
                        <option value="bank_transfer">העברה</option>
                        <option value="check">צ'ק</option>
                      </select>
                    </td>
                    {activeTab === 'vat' && (
                      <td className="px-2 py-1.5 text-center text-xs text-green-600 font-medium">
                        {newExpense.amount ? formatCurrency(calculateVatFromTotal(parseFloat(newExpense.amount) || 0)) : '-'}
                      </td>
                    )}
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleAdd()}
                        disabled={saving || !newExpense.description || !newExpense.amount || !newExpense.expense_date}
                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="הוסף (Enter)"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Recurring expenses separator */}
                  {recurringCount > 0 && (
                    <tr className="bg-purple-50">
                      <td colSpan={activeTab === 'vat' ? 9 : 8} className="px-3 py-1.5 text-xs font-medium text-purple-700 flex items-center gap-1">
                        <Pin className="w-3 h-3" />
                        הוצאות קבועות ({recurringCount})
                      </td>
                    </tr>
                  )}
                  
                  {/* Expense rows */}
                  {currentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'vat' ? 9 : 8} className="text-center py-12 text-gray-400">
                        <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm">אין הוצאות לחודש זה</p>
                        <p className="text-xs mt-1">הזן את ההוצאה הראשונה למעלה</p>
                      </td>
                    </tr>
                  ) : (
                    currentExpenses.map((expense, index) => {
                      // Show separator before first non-recurring if there were recurring ones
                      const showSeparator = recurringCount > 0 && index === recurringCount;
                      
                      return (
                      <React.Fragment key={expense.id}>
                        {showSeparator && (
                          <tr className="bg-gray-100">
                            <td colSpan={activeTab === 'vat' ? 9 : 8} className="px-3 py-1.5 text-xs font-medium text-gray-500">
                              הוצאות רגילות ({currentExpenses.length - recurringCount})
                            </td>
                          </tr>
                        )}
                        <tr 
                          onDoubleClick={() => handleDoubleClick(expense.id)}
                          className={`hover:bg-blue-50/50 transition-all duration-300 cursor-pointer select-none ${
                            highlightedIds.has(expense.id)
                              ? 'bg-orange-100 border-r-4 border-r-orange-400'
                              : expense.is_recurring 
                                ? 'bg-purple-50/70 border-r-4 border-r-purple-400' 
                                : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } ${lastAdded === expense.id ? 'bg-green-100 animate-pulse' : ''}`}
                        >
                        {editingId === expense.id ? (
                          <>
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5">
                              <input
                                type="date"
                                value={editData.expense_date}
                                onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                                className="w-full px-1 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                className="w-full px-1 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={editData.supplier_name}
                                onChange={(e) => setEditData({ ...editData, supplier_name: e.target.value })}
                                className="w-full px-1 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={editData.invoice_number}
                                onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                                placeholder="#"
                                className="w-full px-1 py-1 border rounded text-sm text-center"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={editData.amount}
                                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                                className="w-full px-1 py-1 border rounded text-sm text-center"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={editData.payment_method}
                                onChange={(e) => setEditData({ ...editData, payment_method: e.target.value as 'credit' | 'bank_transfer' | 'check' })}
                                className="w-full px-1 py-1 border rounded text-xs"
                              >
                                <option value="credit">אשראי</option>
                                <option value="bank_transfer">העברה</option>
                                <option value="check">צ'ק</option>
                              </select>
                            </td>
                            {activeTab === 'vat' && (
                              <td className="px-2 py-1.5 text-center text-xs text-green-600">
                                {editData.amount ? formatCurrency(calculateVatFromTotal(parseFloat(editData.amount) || 0)) : '-'}
                              </td>
                            )}
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveEdit(expense.id, activeTab === 'vat' ? 'vat' : 'noVat')}
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
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleToggleRecurring(expense.id, activeTab === 'vat' ? 'vat' : 'noVat', !expense.is_recurring)}
                                className={`p-1 rounded transition-colors ${expense.is_recurring ? 'text-purple-600 hover:text-purple-800' : 'text-gray-300 hover:text-purple-400'}`}
                                title={expense.is_recurring ? 'הסר מהוצאות קבועות' : 'הפוך להוצאה קבועה'}
                              >
                                {expense.is_recurring ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-sm text-gray-500">
                              {formatDate(expense.expense_date)}
                            </td>
                            <td className="px-2 py-2">
                              <span className="text-sm font-medium text-gray-900">{expense.description}</span>
                            </td>
                            <td className="px-2 py-2 text-sm text-gray-500">
                              {expense.supplier_name || '-'}
                            </td>
                            <td className="px-2 py-2 text-center text-xs text-gray-400">
                              {expense.invoice_number || '-'}
                            </td>
                            <td className="px-2 py-2 text-center text-sm font-semibold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-2 py-2 text-center text-xs text-gray-500">
                              {expense.payment_method === 'bank_transfer' ? 'העברה' : expense.payment_method === 'check' ? "צ'ק" : 'אשראי'}
                            </td>
                            {activeTab === 'vat' && (
                              <td className="px-2 py-2 text-center text-sm font-medium text-green-600">
                                {formatCurrency(expense.vat_amount || 0)}
                              </td>
                            )}
                            <td className="px-2 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleStartEdit(expense)}
                                  className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(expense.id, activeTab === 'vat' ? 'vat' : 'noVat')}
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
                        <td colSpan={activeTab === 'vat' ? 9 : 8} className="p-0">
                          <div className="h-px bg-gray-200"></div>
                        </td>
                      </tr>
                      </React.Fragment>
                    )})
                  )}
                </tbody>
              </table>
              
              {/* Table Footer */}
              {currentExpenses.length > 0 && (
                <div className="bg-gray-50 border-t px-4 py-2 flex justify-between items-center text-sm">
                  <span className="text-gray-500">{currentExpenses.length} הוצאות</span>
                  <div className="flex gap-4 font-semibold">
                    <span className="text-gray-900">{formatCurrency(activeTab === 'vat' ? vatTotal : noVatTotal)}</span>
                    {activeTab === 'vat' && (
                      <span className="text-green-600">מע"מ: {formatCurrency(vatVatTotal)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
