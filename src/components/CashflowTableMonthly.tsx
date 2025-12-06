'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyData } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { getMonthDays } from './MonthPicker';
import OrdersModal from './OrdersModal';
import ExpensesManager from './ExpensesManager';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ShoppingCart,
  Loader2,
  Edit3,
  Check,
  X,
  Zap,
  ZapOff,
  Receipt,
  Users
} from 'lucide-react';

interface CashflowTableProps {
  month: number;
  year: number;
  onSync: () => void;
  isLoading: boolean;
}

interface EditingCell {
  date: string;
  field: keyof DailyData;
}

interface ExpensesByDate {
  [date: string]: {
    vat: number;
    vatAmount: number;
    noVat: number;
  };
}

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds - refresh from DB
const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes - sync from WooCommerce

interface DailyDataWithExpenses extends DailyData {
  expensesVat: number;
  expensesVatAmount: number;
  expensesNoVat: number;
  employeeCost: number;
}

export default function CashflowTable({ month, year, onSync, isLoading }: CashflowTableProps) {
  const { currentBusiness } = useAuth();
  const [data, setData] = useState<DailyDataWithExpenses[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoSync, setAutoSync] = useState(true); // Auto sync from WooCommerce
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showExpensesManager, setShowExpensesManager] = useState(false);
  
  // Orders modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Employee daily cost
  const [employeeDailyCost, setEmployeeDailyCost] = useState(0);

  // Get date range for the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Build query params with businessId
  const buildQueryParams = useCallback((params: Record<string, string>) => {
    const queryParams = new URLSearchParams(params);
    if (currentBusiness?.id) {
      queryParams.set('businessId', currentBusiness.id);
    }
    return queryParams.toString();
  }, [currentBusiness?.id]);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Fetch cashflow data, daily costs, expenses, and employee cost in parallel
      const [cashflowRes, costsRes, expensesRes, employeesRes] = await Promise.all([
        fetch(`/api/cashflow?${buildQueryParams({ start: startDate, end: endDate })}`),
        fetch(`/api/daily-costs?${buildQueryParams({ startDate, endDate })}`),
        fetch(`/api/expenses?${buildQueryParams({ startDate, endDate })}`),
        fetch(`/api/employees?${buildQueryParams({ month: String(month + 1), year: String(year) })}`),
      ]);
      
      const cashflowJson = await cashflowRes.json();
      const costsJson = await costsRes.json();
      const expensesJson = await expensesRes.json();
      const employeesJson = await employeesRes.json();
      
      // Get employee daily cost
      const dailyEmpCost = employeesJson.dailyCost || 0;
      setEmployeeDailyCost(dailyEmpCost);
      
      // Get costs by date
      const costsByDate: Record<string, number> = costsJson.costsByDate || {};
      
      // Process expenses by date
      const expensesByDate: ExpensesByDate = {};
      (expensesJson.vatExpenses || []).forEach((exp: any) => {
        const date = exp.expense_date;
        if (!expensesByDate[date]) {
          expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
        }
        expensesByDate[date].vat += exp.amount || 0;
        expensesByDate[date].vatAmount += exp.vat_amount || 0;
      });
      (expensesJson.noVatExpenses || []).forEach((exp: any) => {
        const date = exp.expense_date;
        if (!expensesByDate[date]) {
          expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
        }
        expensesByDate[date].noVat += exp.amount || 0;
      });
      
      if (cashflowJson.data) {
        const dataMap = new Map(cashflowJson.data.map((d: DailyData) => [d.date, d]));
        const allDays = getMonthDays(month, year);
        
        const dates: DailyDataWithExpenses[] = allDays.map(dateStr => {
          const existing = dataMap.get(dateStr) as DailyData | undefined;
          const materialsCost = costsByDate[dateStr] || 0;
          const dayExpenses = expensesByDate[dateStr] || { vat: 0, vatAmount: 0, noVat: 0 };
          
          if (existing) {
            // Recalculate totals with real materials cost and expenses
            // VAT calculation: revenue VAT - deductible VAT from all sources
            const revenueVat = existing.vat || 0;
            const shippingCost = existing.shippingCost || 0;
            
            // Calculate VAT from shipping and materials (they include VAT)
            // Formula: amount * (vatRate / (100 + vatRate)) where vatRate = 17%
            const vatRate = 17;
            const shippingVat = shippingCost * (vatRate / (100 + vatRate));
            const materialsVat = materialsCost * (vatRate / (100 + vatRate));
            
            // Total deductible VAT = expenses VAT + shipping VAT + materials VAT
            const totalDeductibleVat = dayExpenses.vatAmount + shippingVat + materialsVat;
            const netVat = Math.max(0, revenueVat - totalDeductibleVat);
            
            const totalExpenses = 
              (existing.googleAdsCost || 0) +
              (existing.facebookAdsCost || 0) +
              (existing.tiktokAdsCost || 0) +
              shippingCost +
              materialsCost +
              (existing.creditCardFees || 0) +
              netVat +
              dayExpenses.vat +
              dayExpenses.noVat +
              dailyEmpCost;
            const profit = (existing.revenue || 0) - totalExpenses;
            
            return {
              ...existing,
              materialsCost,
              vat: netVat,
              totalExpenses,
              profit,
              expensesVat: dayExpenses.vat,
              expensesVatAmount: dayExpenses.vatAmount,
              expensesNoVat: dayExpenses.noVat,
              employeeCost: dailyEmpCost,
            };
          }
          
          const totalExpenses = materialsCost + dayExpenses.vat + dayExpenses.noVat + dailyEmpCost;
          
          return {
            date: dateStr,
            revenue: 0,
            ordersCount: 0,
            googleAdsCost: 0,
            facebookAdsCost: 0,
            tiktokAdsCost: 0,
            shippingCost: 0,
            materialsCost,
            creditCardFees: 0,
            vat: 0,
            totalExpenses,
            profit: -totalExpenses,
            roi: 0,
            expensesVat: dayExpenses.vat,
            expensesVatAmount: dayExpenses.vatAmount,
            expensesNoVat: dayExpenses.noVat,
            employeeCost: dailyEmpCost,
          };
        });
        
        // Sort by date ascending (1st at top, 31st at bottom)
        setData(dates.sort((a, b) => a.date.localeCompare(b.date)));
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, month, year, buildQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchData(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Auto sync from WooCommerce every 5 minutes (only for today)
  useEffect(() => {
    if (!autoSync || !currentBusiness?.id) return;
    
    const syncToday = async () => {
      const today = new Date().toISOString().split('T')[0];
      // Only sync if we're viewing the current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (month === currentMonth && year === currentYear) {
        console.log('🔄 Auto-syncing today from WooCommerce...');
        try {
          await fetch(`/api/sync?date=${today}&businessId=${currentBusiness.id}`);
          await fetchData(false);
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    };
    
    // Sync immediately on mount
    syncToday();
    
    // Then sync every 5 minutes
    const interval = setInterval(syncToday, AUTO_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [autoSync, currentBusiness?.id, month, year, fetchData]);

  // Fetch orders when clicking on order count
  const handleOrdersClick = async (date: string, ordersCount: number) => {
    if (ordersCount === 0) return;
    
    setSelectedDate(date);
    setLoadingOrders(true);
    setOrders([]);
    
    try {
      const res = await fetch(`/api/orders?${buildQueryParams({ date })}`);
      const json = await res.json();
      setOrders(json.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCellClick = (date: string, field: keyof DailyData, value: number) => {
    // materialsCost is now calculated automatically from order item costs
    const editableFields: (keyof DailyData)[] = ['googleAdsCost', 'facebookAdsCost', 'tiktokAdsCost'];
    if (!editableFields.includes(field)) return;
    
    setEditingCell({ date, field });
    setEditValue(value.toString());
  };

  const handleSave = async () => {
    if (!editingCell) return;
    
    setSaving(true);
    try {
      const numValue = parseFloat(editValue) || 0;
      const existingRow = data.find(d => d.date === editingCell.date);
      
      const updatedRow = { ...existingRow, [editingCell.field]: numValue };
      
      // Get expenses for this day
      const dayExpenses = {
        vat: existingRow?.expensesVat || 0,
        vatAmount: existingRow?.expensesVatAmount || 0,
        noVat: existingRow?.expensesNoVat || 0,
      };
      
      // Calculate net VAT (revenue VAT - deductible VAT from expenses)
      const revenueVat = updatedRow.vat || 0;
      const netVat = Math.max(0, revenueVat - dayExpenses.vatAmount);
      
      const totalExpenses = 
        (updatedRow.googleAdsCost || 0) +
        (updatedRow.facebookAdsCost || 0) +
        (updatedRow.tiktokAdsCost || 0) +
        (updatedRow.shippingCost || 0) +
        (updatedRow.materialsCost || 0) +
        (updatedRow.creditCardFees || 0) +
        netVat +
        dayExpenses.vat +
        dayExpenses.noVat;
      
      const revenue = updatedRow.revenue || 0;
      const profit = revenue - totalExpenses;
      // % רווח מההכנסות
      const roi = revenue > 0 ? (profit / revenue) * 100 : (profit < 0 ? -100 : 0);

      await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingCell.date,
          [editingCell.field]: numValue,
          totalExpenses,
          profit,
          roi,
          businessId: currentBusiness?.id,
        }),
      });

      await fetchData(false);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getDayName = (dateStr: string) => DAYS_HE[new Date(dateStr).getDay()];
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate().toString();
  };

  const renderEditableCell = (row: DailyData, field: keyof DailyData, value: number) => {
    const isEditing = editingCell?.date === row.date && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-20 px-2 py-1 text-sm border rounded bg-white text-gray-900"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={handleCancel} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 rounded px-2 py-1 -mx-2 -my-1 flex items-center gap-1"
        onClick={() => handleCellClick(row.date, field, value)}
      >
        <span>{formatCurrency(value)}</span>
        <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
      </div>
    );
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      ordersCount: acc.ordersCount + row.ordersCount,
      googleAdsCost: acc.googleAdsCost + row.googleAdsCost,
      facebookAdsCost: acc.facebookAdsCost + row.facebookAdsCost,
      tiktokAdsCost: acc.tiktokAdsCost + (row.tiktokAdsCost || 0),
      shippingCost: acc.shippingCost + row.shippingCost,
      materialsCost: acc.materialsCost + row.materialsCost,
      creditCardFees: acc.creditCardFees + row.creditCardFees,
      vat: acc.vat + row.vat,
      expensesVat: acc.expensesVat + row.expensesVat,
      expensesNoVat: acc.expensesNoVat + row.expensesNoVat,
      employeeCost: acc.employeeCost + row.employeeCost,
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, ordersCount: 0, googleAdsCost: 0, facebookAdsCost: 0, tiktokAdsCost: 0, shippingCost: 0, materialsCost: 0, creditCardFees: 0, vat: 0, expensesVat: 0, expensesNoVat: 0, employeeCost: 0, totalExpenses: 0, profit: 0 }
  );

  // % רווח ממוצע מההכנסות
  const avgROI = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : (totals.profit < 0 ? -100 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">טבלת תזרים מזומנים</h2>
            <p className="text-blue-100 text-sm">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExpensesManager(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              title="ניהול הוצאות"
            >
              <Receipt className="w-5 h-5" />
              <span className="hidden sm:inline">הוצאות</span>
            </button>
            
            <button
              onClick={() => {
                setAutoRefresh(!autoRefresh);
                setAutoSync(!autoSync);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-green-500/20 text-green-100' : 'bg-white/10 text-white/70'
              }`}
              title={autoRefresh ? 'סנכרון אוטומטי פעיל (כל 5 דקות)' : 'סנכרון אוטומטי כבוי'}
            >
              {autoRefresh ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              <span className="text-sm hidden sm:inline">{autoRefresh ? 'חי' : 'כבוי'}</span>
            </button>
            
            <button
              onClick={onSync}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span>סנכרון</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              <span>סה"כ הכנסות</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.revenue)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span>הזמנות</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.ordersCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              {totals.profit >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span>רווח</span>
            </div>
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.profit)}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm group relative">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1 cursor-help">
              <TrendingUp className="w-4 h-4" />
              <span>% רווח ממוצע</span>
              <span className="text-xs text-gray-400">ⓘ</span>
            </div>
            <div className={`text-2xl font-bold ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(avgROI)}
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              אחוז רווח מההכנסות (רווח ÷ הכנסות × 100)
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 sticky right-0 bg-gray-100 w-16">יום</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 w-10">תאריך</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">הכנסות</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">הזמנות</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">גוגל</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">פייסבוק</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">טיקטוק</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">משלוח</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">חומרים</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">אשראי</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 bg-indigo-50">שכר</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 bg-purple-50">מוכר</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 bg-amber-50">חו"ל</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">מע"מ</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">הוצאות</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600">רווח</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 group relative">
                  <span className="cursor-help">% רווח <span className="text-xs text-gray-400">ⓘ</span></span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-normal">
                    אחוז רווח מההכנסות (רווח ÷ הכנסות × 100)
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.date} className={`border-b hover:bg-gray-50 group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 font-medium text-gray-900 sticky right-0 bg-inherit text-xs">{getDayName(row.date)}</td>
                  <td className="px-3 py-2 text-gray-600 font-bold">{formatDate(row.date)}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleOrdersClick(row.date, row.ordersCount)}
                      disabled={row.ordersCount === 0}
                      className={`font-medium px-2 py-1 rounded ${
                        row.ordersCount > 0 
                          ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' 
                          : 'text-gray-400'
                      }`}
                    >
                      {row.ordersCount}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{renderEditableCell(row, 'googleAdsCost', row.googleAdsCost)}</td>
                  <td className="px-3 py-2 text-gray-600">{renderEditableCell(row, 'facebookAdsCost', row.facebookAdsCost)}</td>
                  <td className="px-3 py-2 text-gray-600">{renderEditableCell(row, 'tiktokAdsCost', row.tiktokAdsCost || 0)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrency(row.shippingCost)}</td>
                  <td className="px-3 py-2 text-gray-600">
                    <span className={row.materialsCost > 0 ? 'text-orange-600' : 'text-gray-400'}>
                      {formatCurrency(row.materialsCost)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrency(row.creditCardFees)}</td>
                  <td className="px-3 py-2 bg-indigo-50/50">
                    <span className={row.employeeCost > 0 ? 'text-indigo-600' : 'text-gray-400'}>
                      {formatCurrency(row.employeeCost)}
                    </span>
                  </td>
                  <td className="px-3 py-2 bg-purple-50/50">
                    <span className={row.expensesVat > 0 ? 'text-purple-600' : 'text-gray-400'}>
                      {formatCurrency(row.expensesVat)}
                    </span>
                  </td>
                  <td className="px-3 py-2 bg-amber-50/50">
                    <span className={row.expensesNoVat > 0 ? 'text-amber-600' : 'text-gray-400'}>
                      {formatCurrency(row.expensesNoVat)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrency(row.vat)}</td>
                  <td className="px-3 py-2 font-medium text-red-600">{formatCurrency(row.totalExpenses)}</td>
                  <td className={`px-3 py-2 font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                  <td className={`px-3 py-2 font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.revenue > 0 
                      ? formatPercent((row.profit / row.revenue) * 100)
                      : row.profit < 0 
                        ? formatPercent(-100) 
                        : formatPercent(0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 font-bold">
              <tr>
                <td className="px-3 py-3 sticky right-0 bg-blue-50">סה"כ</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.revenue)}</td>
                <td className="px-3 py-3 text-gray-900">{totals.ordersCount}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.googleAdsCost)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.facebookAdsCost)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.tiktokAdsCost)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.shippingCost)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.materialsCost)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.creditCardFees)}</td>
                <td className="px-3 py-3 text-indigo-600 bg-indigo-100/50">{formatCurrency(totals.employeeCost)}</td>
                <td className="px-3 py-3 text-purple-600 bg-purple-100/50">{formatCurrency(totals.expensesVat)}</td>
                <td className="px-3 py-3 text-amber-600 bg-amber-100/50">{formatCurrency(totals.expensesNoVat)}</td>
                <td className="px-3 py-3 text-gray-900">{formatCurrency(totals.vat)}</td>
                <td className="px-3 py-3 text-red-600">{formatCurrency(totals.totalExpenses)}</td>
                <td className={`px-3 py-3 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.profit)}
                </td>
                <td className={`px-3 py-3 ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(avgROI)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Orders Modal */}
      <OrdersModal
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ''}
        orders={orders}
        isLoading={loadingOrders}
      />
      
      {/* Expenses Manager Modal */}
      {showExpensesManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">ניהול הוצאות</h2>
              <button
                onClick={() => {
                  setShowExpensesManager(false);
                  fetchData(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ExpensesManager
                month={month}
                year={year}
                onClose={() => {
                  setShowExpensesManager(false);
                  fetchData(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
