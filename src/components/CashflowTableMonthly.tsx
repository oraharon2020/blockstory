'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Package,
  Loader2,
  Edit3,
  Check,
  X,
  Zap,
  ZapOff,
  Receipt,
  Users,
  Settings2,
  Search
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

// Column definitions for monthly table
interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'day', label: 'יום', required: true },
  { key: 'date', label: 'תאריך', required: true },
  { key: 'revenue', label: 'הכנסות', required: true },
  { key: 'ordersCount', label: 'הזמנות' },
  { key: 'googleAdsCost', label: 'גוגל' },
  { key: 'facebookAdsCost', label: 'פייסבוק' },
  { key: 'tiktokAdsCost', label: 'טיקטוק' },
  { key: 'shippingCost', label: 'משלוח' },
  { key: 'materialsCost', label: 'חומרים' },
  { key: 'creditCardFees', label: 'אשראי' },
  { key: 'employeeCost', label: 'שכר' },
  { key: 'customerRefunds', label: 'זיכויים' },
  { key: 'expensesVat', label: 'מוכר (עם מע"מ)' },
  { key: 'expensesNoVat', label: 'חו"ל (ללא מע"מ)' },
  { key: 'vat', label: 'מע"מ' },
  { key: 'totalExpenses', label: 'הוצאות' },
  { key: 'profit', label: 'רווח', required: true },
  { key: 'roi', label: '% רווח' },
];

const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.map(c => c.key);

interface DailyDataWithExpenses extends DailyData {
  expensesVat: number;
  expensesVatAmount: number;
  expensesNoVat: number;
  employeeCost: number;
  customerRefunds: number;
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
  const [expensesModalExpanded, setExpensesModalExpanded] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const columnSettingsRef = useRef<HTMLDivElement>(null);
  
  // Orders modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Highlighted row (click to pin)
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  
  // Quick search
  const [quickSearch, setQuickSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{date: string, orderId: string, customerName: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Employee daily cost
  const [employeeDailyCost, setEmployeeDailyCost] = useState(0);
  
  // Total products sold
  const [totalProductsSold, setTotalProductsSold] = useState(0);
  
  // VAT rate from business settings
  const [vatRate, setVatRate] = useState(18); // Default 18%
  
  // Credit fee mode from business settings
  const [creditFeeMode, setCreditFeeMode] = useState<'percentage' | 'manual'>('percentage');
  
  // Expenses spread mode from business settings
  const [expensesSpreadMode, setExpensesSpreadMode] = useState<'exact' | 'spread'>('exact');

  // Load visible columns from localStorage
  useEffect(() => {
    if (currentBusiness?.id) {
      const saved = localStorage.getItem(`columns_monthly_${currentBusiness.id}`);
      if (saved) {
        try {
          setVisibleColumns(JSON.parse(saved));
        } catch {
          setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        }
      }
    }
  }, [currentBusiness?.id]);

  // Save visible columns to localStorage
  const toggleColumn = (columnKey: string) => {
    const column = ALL_COLUMNS.find(c => c.key === columnKey);
    if (column?.required) return;
    
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(c => c !== columnKey)
      : [...visibleColumns, columnKey];
    
    setVisibleColumns(newColumns);
    if (currentBusiness?.id) {
      localStorage.setItem(`columns_monthly_${currentBusiness.id}`, JSON.stringify(newColumns));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  // Get date range for the month (month is 1-12)
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Build query params with businessId
  const buildQueryParams = useCallback((params: Record<string, string>) => {
    const queryParams = new URLSearchParams(params);
    if (currentBusiness?.id) {
      queryParams.set('businessId', currentBusiness.id);
    }
    return queryParams.toString();
  }, [currentBusiness?.id]);

  const fetchData = useCallback(async (showLoading = true) => {
    // Don't fetch if no business selected
    if (!currentBusiness?.id) return;
    
    try {
      if (showLoading) setLoading(true);
      
      // Fetch cashflow data, daily costs, expenses, employee cost, refunds, and business settings in parallel
      const [cashflowRes, costsRes, expensesRes, employeesRes, refundsRes, settingsRes] = await Promise.all([
        fetch(`/api/cashflow?${buildQueryParams({ start: startDate, end: endDate })}`),
        fetch(`/api/daily-costs?${buildQueryParams({ startDate, endDate })}`),
        fetch(`/api/expenses?${buildQueryParams({ startDate, endDate })}`),
        fetch(`/api/employees?${buildQueryParams({ month: String(month), year: String(year) })}`),
        fetch(`/api/refunds?${buildQueryParams({ startDate, endDate })}`),
        fetch(`/api/business-settings?${buildQueryParams({})}`),
      ]);
      
      const cashflowJson = await cashflowRes.json();
      const costsJson = await costsRes.json();
      const expensesJson = await expensesRes.json();
      const employeesJson = await employeesRes.json();
      const refundsJson = await refundsRes.json();
      const settingsJson = await settingsRes.json();
      
      // Get VAT rate from business settings
      const businessVatRate = parseFloat(settingsJson.data?.vatRate) || 18;
      setVatRate(businessVatRate);
      
      // Get credit fee mode from business settings
      const businessCreditFeeMode = settingsJson.data?.creditFeeMode || 'percentage';
      setCreditFeeMode(businessCreditFeeMode);
      
      // Get expenses spread mode from business settings
      const businessExpensesSpreadMode = settingsJson.data?.expensesSpreadMode || 'exact';
      setExpensesSpreadMode(businessExpensesSpreadMode);
      
      // Get employee daily cost
      const dailyEmpCost = employeesJson.dailyCost || 0;
      setEmployeeDailyCost(dailyEmpCost);
      
      // Get total products sold
      const totalQty = costsJson.totalQuantity || 0;
      setTotalProductsSold(totalQty);
      
      // Get costs by date (materials)
      const costsByDate: Record<string, number> = costsJson.costsByDate || {};
      
      // Get shipping by date (from order_item_costs - stored without VAT)
      const shippingByDate: Record<string, number> = costsJson.shippingByDate || {};
      
      // Get refunds by date
      const refundsByDate: Record<string, number> = refundsJson.refundsByDate || {};
      
      // Process expenses by date
      const expensesByDate: ExpensesByDate = {};
      let totalVatExpenses = 0;
      let totalVatAmount = 0;
      let totalNoVatExpenses = 0;
      
      (expensesJson.vatExpenses || []).forEach((exp: any) => {
        const date = exp.expense_date;
        const amount = exp.amount || 0;
        const vatAmount = exp.vat_amount || 0;
        
        if (!expensesByDate[date]) {
          expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
        }
        expensesByDate[date].vat += amount;
        expensesByDate[date].vatAmount += vatAmount;
        totalVatExpenses += amount;
        totalVatAmount += vatAmount;
      });
      (expensesJson.noVatExpenses || []).forEach((exp: any) => {
        const date = exp.expense_date;
        const amount = exp.amount || 0;
        
        if (!expensesByDate[date]) {
          expensesByDate[date] = { vat: 0, vatAmount: 0, noVat: 0 };
        }
        expensesByDate[date].noVat += amount;
        totalNoVatExpenses += amount;
      });
      
      // Calculate total refunds
      let totalRefunds = 0;
      Object.values(refundsByDate).forEach((amount: number) => {
        totalRefunds += amount;
      });
      
      // Calculate daily spread amounts
      const allDays = getMonthDays(month, year);
      const daysCount = allDays.length;
      const dailyVatExpense = totalVatExpenses / daysCount;
      const dailyVatAmount = totalVatAmount / daysCount;
      const dailyNoVatExpense = totalNoVatExpenses / daysCount;
      const dailyRefund = totalRefunds / daysCount;
      
      if (cashflowJson.data) {
        const dataMap = new Map(cashflowJson.data.map((d: DailyData) => [d.date, d]));
        
        const dates: DailyDataWithExpenses[] = allDays.map(dateStr => {
          const existing = dataMap.get(dateStr) as DailyData | undefined;
          const materialsCost = costsByDate[dateStr] || 0;
          
          // Use spread or exact based on setting
          const dayExpenses = businessExpensesSpreadMode === 'spread' 
            ? { vat: dailyVatExpense, vatAmount: dailyVatAmount, noVat: dailyNoVatExpense }
            : (expensesByDate[dateStr] || { vat: 0, vatAmount: 0, noVat: 0 });
          const dayRefunds = businessExpensesSpreadMode === 'spread'
            ? dailyRefund
            : (refundsByDate[dateStr] || 0);
          
          // Use manual shipping from order_item_costs if available, otherwise use existing
          const manualShipping = shippingByDate[dateStr] || 0;
          
          if (existing) {
            // Recalculate totals with real materials cost and expenses
            // VAT calculation: revenue VAT - deductible VAT from all sources
            // Revenue includes VAT, so we extract it: revenue * (vatRate / (100 + vatRate))
            const revenueVat = (existing.revenue || 0) * (businessVatRate / (100 + businessVatRate));
            
            // If we have manual shipping from order_item_costs, use it (stored without VAT, add VAT)
            // Manual shipping is entered without VAT, so we add VAT here
            // Using businessVatRate from settings (default 18%)
            const shippingCost = manualShipping > 0 
              ? manualShipping * (1 + businessVatRate / 100)  // Add VAT to manual shipping
              : (existing.shippingCost || 0);         // Use existing shipping (already includes VAT)
            
            // Calculate VAT from shipping and materials (they include VAT)
            // Formula: amount * (vatRate / (100 + vatRate))
            const shippingVat = shippingCost * (businessVatRate / (100 + businessVatRate));
            const materialsVat = materialsCost * (businessVatRate / (100 + businessVatRate));
            
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
              dailyEmpCost +
              dayRefunds;
            const profit = (existing.revenue || 0) - totalExpenses;
            
            return {
              ...existing,
              shippingCost,
              materialsCost,
              vat: netVat,
              totalExpenses,
              profit,
              expensesVat: dayExpenses.vat,
              expensesVatAmount: dayExpenses.vatAmount,
              expensesNoVat: dayExpenses.noVat,
              employeeCost: dailyEmpCost,
              customerRefunds: dayRefunds,
            };
          }
          
          const totalExpenses = materialsCost + dayExpenses.vat + dayExpenses.noVat + dailyEmpCost + dayRefunds;
          
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
            customerRefunds: dayRefunds,
          };
        });
        
        // Sort by date ascending (1st at top, 31st at bottom)
        const sortedDates = dates.sort((a, b) => a.date.localeCompare(b.date));
        setData(sortedDates);
        setLastUpdate(new Date());
        
        // Save calculated data back to DB for AI and other consumers
        // Only update rows that have orders (revenue > 0) to avoid overwriting with empty data
        if (currentBusiness?.id) {
          const rowsToUpdate = sortedDates.filter(row => row.revenue > 0 || row.totalExpenses > 0);
          for (const row of rowsToUpdate) {
            fetch('/api/cashflow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: row.date,
                revenue: row.revenue,
                ordersCount: row.ordersCount,
                itemsCount: row.itemsCount || 0,
                googleAdsCost: row.googleAdsCost,
                facebookAdsCost: row.facebookAdsCost,
                tiktokAdsCost: row.tiktokAdsCost,
                shippingCost: row.shippingCost,
                materialsCost: row.materialsCost,
                creditCardFees: row.creditCardFees,
                vat: row.vat,
                employeeCost: row.employeeCost,
                customerRefunds: row.customerRefunds,
                expensesVat: row.expensesVat,
                expensesNoVat: row.expensesNoVat,
                totalExpenses: row.totalExpenses,
                profit: row.profit,
                roi: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
                businessId: currentBusiness.id,
              }),
            }).catch(err => console.error('Error syncing row to DB:', err));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, month, year, buildQueryParams, currentBusiness?.id]);

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
      // Only sync if we're viewing the current month (month is 1-12)
      const currentMonth = new Date().getMonth() + 1; // Convert to 1-12
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
    // creditCardFees is editable only when creditFeeMode is 'manual'
    const editableFields: (keyof DailyData)[] = ['googleAdsCost', 'facebookAdsCost', 'tiktokAdsCost'];
    if (creditFeeMode === 'manual') {
      editableFields.push('creditCardFees');
    }
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

  // Quick search for order/customer
  const handleQuickSearch = async (query: string) => {
    setQuickSearch(query);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        search: query,
      });
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      
      const res = await fetch(`/api/orders/search?${params.toString()}`);
      const json = await res.json();
      
      setSearchResults(json.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultClick = (date: string) => {
    setHighlightedRow(date);
    setQuickSearch('');
    setSearchResults([]);
    // Scroll to the row
    const row = document.querySelector(`tr[data-date="${date}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
      customerRefunds: acc.customerRefunds + (row.customerRefunds || 0),
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      profit: acc.profit + row.profit,
      itemsCount: acc.itemsCount + (row.itemsCount || 0),
    }),
    { revenue: 0, ordersCount: 0, itemsCount: 0, googleAdsCost: 0, facebookAdsCost: 0, tiktokAdsCost: 0, shippingCost: 0, materialsCost: 0, creditCardFees: 0, vat: 0, expensesVat: 0, expensesNoVat: 0, employeeCost: 0, customerRefunds: 0, totalExpenses: 0, profit: 0 }
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
            {/* Column settings dropdown */}
            <div className="relative" ref={columnSettingsRef}>
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
                title="הגדרות עמודות"
              >
                <Settings2 className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">עמודות</span>
              </button>
              
              {showColumnSettings && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border p-3 z-50 min-w-[200px]">
                  <div className="text-gray-700 font-medium mb-2 text-sm">בחר עמודות להצגה:</div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {ALL_COLUMNS.map(column => (
                      <label
                        key={column.key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${
                          column.required ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          disabled={column.required}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 text-sm">{column.label}</span>
                        {column.required && (
                          <span className="text-xs text-gray-400">(חובה)</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50">
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
              <Package className="w-4 h-4 text-orange-500" />
              <span>מוצרים שנמכרו</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{totals.itemsCount || totalProductsSold}</div>
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
          {/* Search & Tip Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b gap-4">
            {/* Quick Search */}
            <div className="relative flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => handleQuickSearch(e.target.value)}
                  placeholder="חפש מס' הזמנה או שם לקוח..."
                  className="w-full pr-9 pl-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchLoading && (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchResultClick(result.date)}
                      className="w-full px-3 py-2 text-right hover:bg-blue-50 flex items-center justify-between gap-2 border-b last:border-b-0"
                    >
                      <div>
                        <span className="font-medium text-gray-800">#{result.orderId}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-gray-600">{result.customerName}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {new Date(result.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Tip & Actions */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>💡 לחץ על שורה כדי להדגיש</span>
              {highlightedRow && (
                <button 
                  onClick={() => setHighlightedRow(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  בטל הדגשה
                </button>
              )}
            </div>
          </div>
          <table className="w-full text-xs" dir="rtl">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {isColumnVisible('day') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600 sticky right-0 bg-gray-100 border-l border-gray-200">יום</th>}
                {isColumnVisible('date') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">תאריך</th>}
                {isColumnVisible('revenue') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">הכנסות</th>}
                {isColumnVisible('ordersCount') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">הזמנות</th>}
                {isColumnVisible('googleAdsCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">גוגל</th>}
                {isColumnVisible('facebookAdsCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">פייס</th>}
                {isColumnVisible('tiktokAdsCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">טיקטוק</th>}
                {isColumnVisible('shippingCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">משלוח</th>}
                {isColumnVisible('materialsCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">חומרים</th>}
                {isColumnVisible('creditCardFees') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">אשראי</th>}
                {isColumnVisible('employeeCost') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600 bg-indigo-50">שכר</th>}
                {isColumnVisible('customerRefunds') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600 bg-red-50">זיכויים</th>}
                {isColumnVisible('expensesVat') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600 bg-purple-50">מוכר</th>}
                {isColumnVisible('expensesNoVat') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600 bg-amber-50">חו"ל</th>}
                {isColumnVisible('vat') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">מע"מ</th>}
                {isColumnVisible('totalExpenses') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">הוצאות</th>}
                {isColumnVisible('profit') && <th className="px-1.5 py-2 text-right font-semibold text-gray-600">רווח</th>}
                {isColumnVisible('roi') && (
                  <th className="px-1.5 py-2 text-right font-semibold text-gray-600 group relative">
                    <span className="cursor-help">%</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const isToday = row.date === new Date().toISOString().split('T')[0];
                return (
                <tr 
                  key={row.date}
                  data-date={row.date}
                  onDoubleClick={() => setHighlightedRow(highlightedRow === row.date ? null : row.date)}
                  className={`
                    border-b-2 cursor-pointer transition-all duration-150
                    ${highlightedRow === row.date 
                      ? 'bg-yellow-100 hover:bg-yellow-100 shadow-lg ring-2 ring-yellow-400 ring-inset border-yellow-300' 
                      : isToday
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 ring-1 ring-emerald-400'
                        : index % 2 === 0 
                          ? 'bg-white hover:bg-blue-100 border-gray-100' 
                          : 'bg-slate-100 hover:bg-blue-100 border-gray-200'
                    }
                  `}
                >
                  {isColumnVisible('day') && (
                    <td className={`px-1.5 py-2 font-bold text-gray-900 sticky right-0 border-l-2 ${
                      highlightedRow === row.date 
                        ? 'bg-yellow-100 border-gray-300' 
                        : isToday 
                          ? 'bg-emerald-50 border-emerald-400' 
                          : index % 2 === 0 
                            ? 'bg-white border-gray-300' 
                            : 'bg-slate-100 border-gray-300'
                    }`}>
                      {isToday && <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-0.5 animate-pulse"></span>}
                      {getDayName(row.date)}
                    </td>
                  )}
                  {isColumnVisible('date') && (
                    <td className={`px-1.5 py-2 font-bold ${isToday ? 'text-emerald-800' : 'text-gray-700'}`}>
                      {isToday && <span className="text-[10px] bg-emerald-600 text-white px-1 py-0.5 rounded mr-1">היום</span>}
                      {formatDate(row.date)}
                    </td>
                  )}
                  {isColumnVisible('revenue') && <td className="px-1.5 py-2 font-semibold text-gray-900">{formatCurrency(row.revenue)}</td>}
                  {isColumnVisible('ordersCount') && (
                    <td className="px-1.5 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOrdersClick(row.date, row.ordersCount); }}
                        disabled={row.ordersCount === 0}
                        className={`font-medium ${
                          row.ordersCount > 0 
                            ? 'text-blue-600 hover:bg-blue-100 cursor-pointer' 
                            : 'text-gray-400'
                        }`}
                      >
                        {row.ordersCount}
                      </button>
                    </td>
                  )}
                  {isColumnVisible('googleAdsCost') && <td className="px-1.5 py-2 text-gray-700">{renderEditableCell(row, 'googleAdsCost', row.googleAdsCost)}</td>}
                  {isColumnVisible('facebookAdsCost') && <td className="px-1.5 py-2 text-gray-700">{renderEditableCell(row, 'facebookAdsCost', row.facebookAdsCost)}</td>}
                  {isColumnVisible('tiktokAdsCost') && <td className="px-1.5 py-2 text-gray-700">{renderEditableCell(row, 'tiktokAdsCost', row.tiktokAdsCost || 0)}</td>}
                  {isColumnVisible('shippingCost') && <td className="px-1.5 py-2 text-gray-700">{formatCurrency(row.shippingCost)}</td>}
                  {isColumnVisible('materialsCost') && (
                    <td className="px-1.5 py-2">
                      <span className={row.materialsCost > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                        {formatCurrency(row.materialsCost)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('creditCardFees') && (
                    <td className="px-1.5 py-2 text-gray-700 group">
                      {creditFeeMode === 'manual' 
                        ? renderEditableCell(row, 'creditCardFees', row.creditCardFees)
                        : formatCurrency(row.creditCardFees)
                      }
                    </td>
                  )}
                  {isColumnVisible('employeeCost') && (
                    <td className={`px-1.5 py-2 ${highlightedRow === row.date ? 'bg-yellow-100 ring-2 ring-yellow-400 ring-inset' : 'bg-indigo-50/70'}`}>
                      <span className={row.employeeCost > 0 ? 'text-indigo-700 font-medium' : 'text-gray-400'}>
                        {formatCurrency(row.employeeCost)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('customerRefunds') && (
                    <td className={`px-1.5 py-2 ${highlightedRow === row.date ? 'bg-yellow-100 ring-2 ring-yellow-400 ring-inset' : 'bg-red-50/70'}`}>
                      <span className={(row.customerRefunds || 0) > 0 ? 'text-red-700 font-medium' : 'text-gray-400'}>
                        {formatCurrency(row.customerRefunds || 0)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('expensesVat') && (
                    <td className={`px-1.5 py-2 ${highlightedRow === row.date ? 'bg-yellow-100 ring-2 ring-yellow-400 ring-inset' : 'bg-purple-50/70'}`}>
                      <span className={row.expensesVat > 0 ? 'text-purple-700 font-medium' : 'text-gray-400'}>
                        {formatCurrency(row.expensesVat)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('expensesNoVat') && (
                    <td className={`px-1.5 py-2 ${highlightedRow === row.date ? 'bg-yellow-100 ring-2 ring-yellow-400 ring-inset' : 'bg-amber-50/70'}`}>
                      <span className={row.expensesNoVat > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}>
                        {formatCurrency(row.expensesNoVat)}
                      </span>
                    </td>
                  )}
                  {isColumnVisible('vat') && <td className="px-1.5 py-2 text-gray-700">{formatCurrency(row.vat)}</td>}
                  {isColumnVisible('totalExpenses') && <td className="px-1.5 py-2 font-bold text-red-600">{formatCurrency(row.totalExpenses)}</td>}
                  {isColumnVisible('profit') && (
                    <td className={`px-1.5 py-2 font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.profit)}
                    </td>
                  )}
                  {isColumnVisible('roi') && (
                    <td className={`px-1.5 py-2 font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.revenue > 0 
                        ? formatPercent((row.profit / row.revenue) * 100)
                        : row.profit < 0 
                          ? formatPercent(-100) 
                          : formatPercent(0)}
                    </td>
                  )}
                </tr>
              );
              })}
            </tbody>
            <tfoot className="bg-blue-100 font-bold border-t-2 border-blue-300">
              <tr>
                {isColumnVisible('day') && <td className="px-1.5 py-2 sticky right-0 bg-blue-100 text-blue-800">סה"כ</td>}
                {isColumnVisible('date') && <td className="px-1.5 py-2"></td>}
                {isColumnVisible('revenue') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.revenue)}</td>}
                {isColumnVisible('ordersCount') && <td className="px-1.5 py-2 text-gray-900">{totals.ordersCount}</td>}
                {isColumnVisible('googleAdsCost') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.googleAdsCost)}</td>}
                {isColumnVisible('facebookAdsCost') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.facebookAdsCost)}</td>}
                {isColumnVisible('tiktokAdsCost') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.tiktokAdsCost)}</td>}
                {isColumnVisible('shippingCost') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.shippingCost)}</td>}
                {isColumnVisible('materialsCost') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.materialsCost)}</td>}
                {isColumnVisible('creditCardFees') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.creditCardFees)}</td>}
                {isColumnVisible('employeeCost') && <td className="px-1.5 py-2 text-indigo-700 bg-indigo-100">{formatCurrency(totals.employeeCost)}</td>}
                {isColumnVisible('customerRefunds') && <td className="px-1.5 py-2 text-red-700 bg-red-100">{formatCurrency(totals.customerRefunds)}</td>}
                {isColumnVisible('expensesVat') && <td className="px-1.5 py-2 text-purple-700 bg-purple-100">{formatCurrency(totals.expensesVat)}</td>}
                {isColumnVisible('expensesNoVat') && <td className="px-1.5 py-2 text-amber-700 bg-amber-100">{formatCurrency(totals.expensesNoVat)}</td>}
                {isColumnVisible('vat') && <td className="px-1.5 py-2 text-gray-900">{formatCurrency(totals.vat)}</td>}
                {isColumnVisible('totalExpenses') && <td className="px-1.5 py-2 text-red-700">{formatCurrency(totals.totalExpenses)}</td>}
                {isColumnVisible('profit') && (
                  <td className={`px-1.5 py-2 ${totals.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                )}
                {isColumnVisible('roi') && (
                  <td className={`px-1.5 py-2 ${avgROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPercent(avgROI)}
                  </td>
                )}
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
          <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col transition-all duration-300 ${
            expensesModalExpanded ? 'max-w-[95vw] h-[95vh]' : 'max-w-6xl h-[90vh]'
          }`}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">ניהול הוצאות</h2>
              <button
                onClick={() => {
                  setShowExpensesManager(false);
                  setExpensesModalExpanded(false);
                  fetchData(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ExpensesManager
                month={month}
                year={year}
                onClose={() => {
                  setShowExpensesManager(false);
                  setExpensesModalExpanded(false);
                  fetchData(false);
                }}
                onExpandChange={setExpensesModalExpanded}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
