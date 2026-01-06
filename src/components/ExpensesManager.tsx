'use client';

import React, { useState, useEffect, useRef, KeyboardEvent, useMemo, useCallback } from 'react';
import { Plus, Trash2, Loader2, Receipt, Globe, Copy, Users, RotateCcw, Pencil, Check, X, Pin, PinOff, Search, Maximize2, Minimize2, ExternalLink, FileText, Paperclip, Upload, Mail, Download, CheckCircle2, Circle, Filter, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import EmployeesManager from './EmployeesManager';
import EmailScanner from './EmailScanner';
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
  file_url?: string;
  is_verified?: boolean;
  verified_at?: string;
}

interface ExpensesManagerProps {
  month: number;
  year: number;
  onUpdate?: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  isFullPage?: boolean;
}

export default function ExpensesManager({ month, year, onUpdate, onClose, isExpanded: externalExpanded, onExpandChange, isFullPage = false }: ExpensesManagerProps) {
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
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [showEmailScanner, setShowEmailScanner] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'verified' | 'unverified'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use external expanded state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleExpandToggle = () => {
    // If not in full page mode, open in new tab
    if (!isFullPage) {
      window.open(`/expenses?month=${month}&year=${year}`, '_blank');
      return;
    }
    // Otherwise toggle expand state
    const newValue = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newValue);
    } else {
      setInternalExpanded(newValue);
    }
  };
  
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

  // Date range for the month (month is 1-12)
  const daysInMonth = new Date(year, month, 0).getDate(); // month is already 1-12, so this gives last day of month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

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

  // Handle file upload for invoice
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness?.id) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', currentBusiness.id);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setPendingFileUrl(data.fileUrl);
      } else {
        console.error('Upload error:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          file_url: pendingFileUrl,
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
        setPendingFileUrl(null);
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

  // Toggle verified status
  const handleToggleVerified = async (id: number, type: 'vat' | 'noVat', isVerified: boolean) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          is_verified: isVerified,
          verified_at: isVerified ? new Date().toISOString() : null,
          businessId: currentBusiness?.id,
        }),
      });

      if (res.ok) {
        // Update local state immediately for better UX
        if (type === 'vat') {
          setVatExpenses(prev => prev.map(e => e.id === id ? { ...e, is_verified: isVerified } : e));
        } else {
          setNoVatExpenses(prev => prev.map(e => e.id === id ? { ...e, is_verified: isVerified } : e));
        }
      }
    } catch (error) {
      console.error('Error toggling verified:', error);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const expenses = activeTab === 'vat' ? vatExpenses : noVatExpenses;
    const headers = activeTab === 'vat' 
      ? ['תאריך', 'תיאור', 'ספק', 'מס׳ חשבונית', 'סכום', 'מע"מ', 'אמצעי תשלום', 'נבדק']
      : ['תאריך', 'תיאור', 'ספק', 'מס׳ חשבונית', 'סכום', 'אמצעי תשלום', 'נבדק'];
    
    const paymentMethodHeb = (pm?: string) => 
      pm === 'bank_transfer' ? 'העברה' : pm === 'check' ? "צ'ק" : 'אשראי';
    
    const rows = expenses.map(e => {
      const base = [
        e.expense_date,
        e.description,
        e.supplier_name || '',
        e.invoice_number || '',
        e.amount,
      ];
      if (activeTab === 'vat') {
        base.push(e.vat_amount || 0);
      }
      base.push(paymentMethodHeb(e.payment_method));
      base.push(e.is_verified ? '✓' : '');
      return base;
    });
    
    // Create CSV content with BOM for Hebrew support
    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `הוצאות_${activeTab === 'vat' ? 'מעמ' : 'ללא_מעמ'}_${month}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  // Verification stats
  const currentAllExpenses = activeTab === 'vat' ? vatExpenses : noVatExpenses;
  const verifiedCount = currentAllExpenses.filter(e => e.is_verified).length;
  const unverifiedCount = currentAllExpenses.length - verifiedCount;

  // Sort and filter expenses: recurring (pinned) first, then by date descending, with search and filter
  const sortedExpenses = useMemo(() => {
    const expenses = activeTab === 'vat' ? vatExpenses : noVatExpenses;
    
    // Filter by verification status
    let filtered = expenses;
    if (filterMode === 'verified') {
      filtered = expenses.filter(e => e.is_verified);
    } else if (filterMode === 'unverified') {
      filtered = expenses.filter(e => !e.is_verified);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(e.amount).includes(searchQuery)
      );
    }
    
    return [...filtered].sort((a, b) => {
      // Recurring expenses first
      if (a.is_recurring && !b.is_recurring) return -1;
      if (!a.is_recurring && b.is_recurring) return 1;
      // Then by date descending
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
    });
  }, [activeTab, vatExpenses, noVatExpenses, searchQuery, filterMode]);

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
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs"
                title="ייצוא לאקסל"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={handleCopyFromPreviousMonth}
                disabled={copying}
                className="flex items-center gap-1 px-2 py-1 text-purple-600 hover:bg-purple-50 rounded text-xs"
                title="העתק מחודש קודם"
              >
                {copying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setShowEmailScanner(true)}
                className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                title="סרוק מיילים"
              >
                <Mail className="w-3 h-3" />
              </button>
              {!isFullPage && (
                <button
                  onClick={handleExpandToggle}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                  title="פתח בחלון חדש"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Verification Status Bar - only for expenses tabs */}
      {(activeTab === 'vat' || activeTab === 'noVat') && currentAllExpenses.length > 0 && (
        <div className="px-4 py-2 bg-gradient-to-l from-gray-50 to-white border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(verifiedCount / currentAllExpenses.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {verifiedCount}/{currentAllExpenses.length}
              </span>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${filterMode === 'all' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                הכל ({currentAllExpenses.length})
              </button>
              <button
                onClick={() => setFilterMode('verified')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${filterMode === 'verified' ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-green-50'}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                נבדקו ({verifiedCount})
              </button>
              <button
                onClick={() => setFilterMode('unverified')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${filterMode === 'unverified' ? 'bg-orange-100 text-orange-700' : 'text-orange-600 hover:bg-orange-50'}`}
              >
                <Circle className="w-3 h-3" />
                ממתינים ({unverifiedCount})
              </button>
            </div>
          </div>
          
          {unverifiedCount === 0 && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              כל ההוצאות נבדקו! 🎉
            </span>
          )}
        </div>
      )}

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
          <div className="p-0">
            {/* Excel-like Grid Table */}
            <div className="bg-white overflow-hidden">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#217346] text-white text-xs font-medium">
                    <th className="px-1 py-2 w-10 border border-[#1a5c38] text-center">✓</th>
                    <th className="px-1 py-2 w-8 border border-[#1a5c38] text-center">#</th>
                    <th className="px-2 py-2 w-24 border border-[#1a5c38] text-right">תאריך</th>
                    <th className="px-2 py-2 border border-[#1a5c38] text-right">תיאור</th>
                    <th className="px-2 py-2 w-28 border border-[#1a5c38] text-right">ספק</th>
                    <th className="px-2 py-2 w-20 border border-[#1a5c38] text-center">חשבונית</th>
                    <th className="px-1 py-2 w-8 border border-[#1a5c38] text-center">📎</th>
                    <th className="px-2 py-2 w-24 border border-[#1a5c38] text-center">סכום</th>
                    <th className="px-2 py-2 w-20 border border-[#1a5c38] text-center">תשלום</th>
                    {activeTab === 'vat' && <th className="px-2 py-2 w-20 border border-[#1a5c38] text-center">מע"מ</th>}
                    <th className="px-1 py-2 w-16 border border-[#1a5c38] text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* Quick Add Row - Excel style */}
                  <tr className="bg-[#e2efda] border-b-2 border-[#217346]">
                    <td className="px-1 py-1 border border-gray-300 text-center text-gray-300">
                      <Circle className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="px-1 py-1 border border-gray-300 text-center">
                      <button
                        onClick={() => setNewExpense({ ...newExpense, is_recurring: !newExpense.is_recurring })}
                        className={`p-0.5 rounded ${newExpense.is_recurring ? 'text-purple-600' : 'text-gray-400'}`}
                        title={newExpense.is_recurring ? 'הסר הצמדה' : 'הוצאה קבועה'}
                      >
                        {newExpense.is_recurring ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <input
                        ref={dateRef}
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, descRef)}
                        className="w-full px-1 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent"
                      />
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <input
                        ref={descRef}
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, supplierRef)}
                        placeholder="תיאור ההוצאה..."
                        className="w-full px-1 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent"
                      />
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <input
                        ref={supplierRef}
                        type="text"
                        value={newExpense.supplier_name}
                        onChange={(e) => setNewExpense({ ...newExpense, supplier_name: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, invoiceRef)}
                        placeholder="ספק"
                        className="w-full px-1 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent"
                      />
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <input
                        ref={invoiceRef}
                        type="text"
                        value={newExpense.invoice_number}
                        onChange={(e) => setNewExpense({ ...newExpense, invoice_number: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, amountRef)}
                        placeholder="#"
                        className="w-full px-1 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent text-center"
                      />
                    </td>
                    <td className="px-1 py-1 border border-gray-300 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {pendingFileUrl ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <a href={pendingFileUrl} target="_blank" rel="noopener noreferrer" className="text-green-600">
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => setPendingFileUrl(null)} className="text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="p-0.5 text-gray-400 hover:text-[#217346]"
                        >
                          {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <input
                        ref={amountRef}
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e)}
                        placeholder="₪"
                        className="w-full px-1 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent text-center font-medium"
                      />
                    </td>
                    <td className="px-1 py-1 border border-gray-300">
                      <select
                        value={newExpense.payment_method}
                        onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value as 'credit' | 'bank_transfer' | 'check' })}
                        className="w-full px-0.5 py-1 text-xs border-0 focus:ring-2 focus:ring-[#217346] bg-transparent"
                      >
                        <option value="credit">אשראי</option>
                        <option value="bank_transfer">העברה</option>
                        <option value="check">צ'ק</option>
                      </select>
                    </td>
                    {activeTab === 'vat' && (
                      <td className="px-1 py-1 border border-gray-300 text-center text-xs text-[#217346] font-medium bg-[#d4edda]">
                        {newExpense.amount ? formatCurrency(calculateVatFromTotal(parseFloat(newExpense.amount) || 0)) : '-'}
                      </td>
                    )}
                    <td className="px-1 py-1 border border-gray-300 text-center">
                      <button
                        onClick={() => handleAdd()}
                        disabled={saving || !newExpense.description || !newExpense.amount || !newExpense.expense_date}
                        className="p-1 bg-[#217346] text-white rounded hover:bg-[#1a5c38] disabled:opacity-30"
                        title="הוסף (Enter)"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expense rows - Excel style */}
                  {currentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'vat' ? 11 : 10} className="text-center py-16 text-gray-400 bg-gray-50">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm">אין הוצאות לחודש זה</p>
                        <p className="text-xs mt-1">הזן את ההוצאה הראשונה בשורה הירוקה למעלה</p>
                      </td>
                    </tr>
                  ) : (
                    currentExpenses.map((expense, index) => (
                      <tr 
                        key={expense.id}
                        onDoubleClick={() => editingId === expense.id ? null : handleStartEdit(expense)}
                        className={`
                          cursor-pointer transition-colors
                          ${expense.is_verified ? 'bg-green-50/50' : ''}
                          ${highlightedIds.has(expense.id) ? 'bg-yellow-100' : ''}
                          ${expense.is_recurring ? 'bg-purple-50' : !expense.is_verified && index % 2 === 0 ? 'bg-white' : !expense.is_verified ? 'bg-gray-50' : ''}
                          ${lastAdded === expense.id ? 'bg-green-100' : ''}
                          ${editingId === expense.id ? 'bg-blue-50' : ''}
                          hover:bg-blue-50
                        `}
                      >
                        {/* Verified Checkbox */}
                        <td className="px-1 py-1.5 border border-gray-200 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleVerified(expense.id, activeTab === 'vat' ? 'vat' : 'noVat', !expense.is_verified); }}
                            className={`p-0.5 rounded transition-colors ${expense.is_verified ? 'text-green-600 hover:text-green-700' : 'text-gray-300 hover:text-green-500'}`}
                            title={expense.is_verified ? 'בוצע ✓' : 'סמן כנבדק'}
                          >
                            {expense.is_verified ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        
                        <td className="px-1 py-1.5 border border-gray-200 text-center text-xs text-gray-400">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleRecurring(expense.id, activeTab === 'vat' ? 'vat' : 'noVat', !expense.is_recurring); }}
                            className={`p-0.5 rounded ${expense.is_recurring ? 'text-purple-600' : 'text-gray-300 hover:text-purple-400'}`}
                          >
                            {expense.is_recurring ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        
                        {editingId === expense.id ? (
                          <>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <input
                                type="date"
                                value={editData.expense_date}
                                onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                                className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <input
                                type="text"
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                            </td>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <input
                                type="text"
                                value={editData.supplier_name}
                                onChange={(e) => setEditData({ ...editData, supplier_name: e.target.value })}
                                className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <input
                                type="text"
                                value={editData.invoice_number}
                                onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                                className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 text-center"
                              />
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-center">
                              {expense.file_url ? (
                                <a href={expense.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                  <FileText className="w-3.5 h-3.5 mx-auto" />
                                </a>
                              ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <input
                                type="number"
                                value={editData.amount}
                                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                                className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 text-center"
                              />
                            </td>
                            <td className="px-1 py-1 border border-blue-300 bg-blue-50">
                              <select
                                value={editData.payment_method}
                                onChange={(e) => setEditData({ ...editData, payment_method: e.target.value as 'credit' | 'bank_transfer' | 'check' })}
                                className="w-full px-0.5 py-0.5 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="credit">אשראי</option>
                                <option value="bank_transfer">העברה</option>
                                <option value="check">צ'ק</option>
                              </select>
                            </td>
                            {activeTab === 'vat' && (
                              <td className="px-1 py-1.5 border border-gray-200 text-center text-xs text-[#217346] font-medium">
                                {editData.amount ? formatCurrency(calculateVatFromTotal(parseFloat(editData.amount) || 0)) : '-'}
                              </td>
                            )}
                            <td className="px-1 py-1 border border-gray-200 text-center">
                              <div className="flex gap-0.5 justify-center">
                                <button
                                  onClick={() => handleSaveEdit(expense.id, activeTab === 'vat' ? 'vat' : 'noVat')}
                                  disabled={saving}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-1 py-1.5 border border-gray-200 text-xs text-gray-600">
                              {formatDate(expense.expense_date)}
                            </td>
                            <td className="px-2 py-1.5 border border-gray-200 text-xs font-medium text-gray-900 truncate">
                              {expense.description}
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-xs text-gray-600 truncate">
                              {expense.supplier_name || '-'}
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-center text-xs text-gray-500">
                              {expense.invoice_number || '-'}
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-center">
                              {expense.file_url ? (
                                <a href={expense.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                  <FileText className="w-3.5 h-3.5 mx-auto" />
                                </a>
                              ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-center text-xs font-semibold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-1 py-1.5 border border-gray-200 text-center text-xs text-gray-600">
                              {expense.payment_method === 'bank_transfer' ? 'העברה' : expense.payment_method === 'check' ? "צ'ק" : 'אשראי'}
                            </td>
                            {activeTab === 'vat' && (
                              <td className="px-1 py-1.5 border border-gray-200 text-center text-xs font-medium text-[#217346] bg-[#f0f9f0]">
                                {formatCurrency(expense.vat_amount || 0)}
                              </td>
                            )}
                            <td className="px-1 py-1.5 border border-gray-200 text-center">
                              <div className="flex gap-0.5 justify-center opacity-40 hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStartEdit(expense); }}
                                  className="p-0.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(expense.id, activeTab === 'vat' ? 'vat' : 'noVat'); }}
                                  className="p-0.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Excel-like Footer */}
                {currentExpenses.length > 0 && (
                  <tfoot className="sticky bottom-0">
                    <tr className="bg-[#217346] text-white font-medium text-sm">
                      <td colSpan={7} className="px-2 py-2 border border-[#1a5c38] text-right">
                        סה"כ ({currentExpenses.length} שורות) • נבדקו: {verifiedCount}
                      </td>
                      <td className="px-2 py-2 border border-[#1a5c38] text-center font-bold">
                        {formatCurrency(activeTab === 'vat' ? vatTotal : noVatTotal)}
                      </td>
                      <td className="px-2 py-2 border border-[#1a5c38]"></td>
                      {activeTab === 'vat' && (
                        <td className="px-2 py-2 border border-[#1a5c38] text-center font-bold bg-[#1a5c38]">
                          {formatCurrency(vatVatTotal)}
                        </td>
                      )}
                      <td className="px-2 py-2 border border-[#1a5c38]"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Email Scanner Modal */}
      {showEmailScanner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <EmailScanner
            month={month}
            year={year}
            onInvoicesAdded={() => {
              loadExpenses();
              onUpdate?.();
            }}
            onClose={() => setShowEmailScanner(false)}
          />
        </div>
      )}
    </div>
  );
}
