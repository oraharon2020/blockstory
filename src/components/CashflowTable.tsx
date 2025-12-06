'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyData } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/calculations';
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
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CashflowTableProps {
  startDate: string;
  endDate: string;
  onSync: () => void;
  isLoading: boolean;
}

interface EditingCell {
  date: string;
  field: keyof DailyData;
}

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Column definitions
interface ColumnDef {
  key: string;
  label: string;
  required?: boolean; // Required columns can't be hidden
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'day', label: 'יום', required: true },
  { key: 'date', label: 'תאריך', required: true },
  { key: 'revenue', label: 'הכנסות', required: true },
  { key: 'ordersCount', label: 'מס\' הזמנות' },
  { key: 'googleAdsCost', label: 'פרסום גוגל' },
  { key: 'facebookAdsCost', label: 'פרסום פייסבוק' },
  { key: 'tiktokAdsCost', label: 'פרסום טיקטוק' },
  { key: 'shippingCost', label: 'משלוח' },
  { key: 'materialsCost', label: 'חומרי גלם' },
  { key: 'creditCardFees', label: 'עמלת אשראי' },
  { key: 'vat', label: 'מע"מ' },
  { key: 'totalExpenses', label: 'סה"כ הוצאות' },
  { key: 'profit', label: 'רווח', required: true },
  { key: 'roi', label: '% רווח' },
];

const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.map(c => c.key);

export default function CashflowTable({ startDate, endDate, onSync, isLoading }: CashflowTableProps) {
  const { currentBusiness } = useAuth();
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const columnSettingsRef = useRef<HTMLDivElement>(null);

  // Load visible columns from localStorage
  useEffect(() => {
    if (currentBusiness?.id) {
      const saved = localStorage.getItem(`columns_${currentBusiness.id}`);
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
    if (column?.required) return; // Can't toggle required columns
    
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(c => c !== columnKey)
      : [...visibleColumns, columnKey];
    
    setVisibleColumns(newColumns);
    if (currentBusiness?.id) {
      localStorage.setItem(`columns_${currentBusiness.id}`, JSON.stringify(newColumns));
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

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`/api/cashflow?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      
      if (json.data) {
        // Create a map for existing data
        const dataMap = new Map(json.data.map((d: DailyData) => [d.date, d]));
        
        // Generate all dates in range
        const dates: DailyData[] = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const existing = dataMap.get(dateStr) as DailyData | undefined;
          
          dates.push(existing || {
            date: dateStr,
            revenue: 0,
            ordersCount: 0,
            googleAdsCost: 0,
            facebookAdsCost: 0,
            tiktokAdsCost: 0,
            shippingCost: 0,
            materialsCost: 0,
            creditCardFees: 0,
            vat: 0,
            totalExpenses: 0,
            profit: 0,
            roi: 0,
          });
          
          current.setDate(current.getDate() + 1);
        }
        
        setData(dates.reverse()); // Most recent first
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(false); // Don't show loading spinner for auto-refresh
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleCellClick = (date: string, field: keyof DailyData, value: number) => {
    // Only allow editing certain fields
    const editableFields: (keyof DailyData)[] = ['googleAdsCost', 'facebookAdsCost', 'materialsCost'];
    if (!editableFields.includes(field)) return;
    
    setEditingCell({ date, field });
    setEditValue(value.toString());
  };

  const handleSave = async () => {
    if (!editingCell) return;
    
    setSaving(true);
    try {
      const numValue = parseFloat(editValue) || 0;
      
      // Find existing row
      const existingRow = data.find(d => d.date === editingCell.date);
      
      // Calculate new totals
      const updatedRow = {
        ...existingRow,
        [editingCell.field]: numValue,
      };
      
      // Recalculate totals
      const totalExpenses = 
        (updatedRow.googleAdsCost || 0) +
        (updatedRow.facebookAdsCost || 0) +
        (updatedRow.shippingCost || 0) +
        (updatedRow.materialsCost || 0) +
        (updatedRow.creditCardFees || 0) +
        (updatedRow.vat || 0);
      
      const revenue = updatedRow.revenue || 0;
      const profit = revenue - totalExpenses;
      // % רווח מההכנסות
      const roi = revenue > 0 ? (profit / revenue) * 100 : (profit < 0 ? -100 : 0);

      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingCell.date,
          [editingCell.field]: numValue,
          totalExpenses,
          profit,
          roi,
        }),
      });

      if (res.ok) {
        await fetchData();
      }
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

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return DAYS_HE[date.getDay()];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const renderCell = (row: DailyData, field: keyof DailyData, value: number) => {
    const isEditing = editingCell?.date === row.date && editingCell?.field === field;
    const editableFields: (keyof DailyData)[] = ['googleAdsCost', 'facebookAdsCost', 'tiktokAdsCost', 'materialsCost'];
    const isEditable = editableFields.includes(field);

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
        className={`flex items-center justify-between gap-2 ${isEditable ? 'cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1' : ''}`}
        onClick={() => isEditable && handleCellClick(row.date, field, value)}
      >
        <span>{formatCurrency(value)}</span>
        {isEditable && <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
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
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      profit: acc.profit + row.profit,
    }),
    {
      revenue: 0,
      ordersCount: 0,
      googleAdsCost: 0,
      facebookAdsCost: 0,
      tiktokAdsCost: 0,
      shippingCost: 0,
      materialsCost: 0,
      creditCardFees: 0,
      vat: 0,
      totalExpenses: 0,
      profit: 0,
    }
  );

  // % רווח ממוצע מההכנסות
  const avgROI = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : (totals.profit < 0 ? -100 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
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

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-white/10 text-white/70'
            }`}
            title={autoRefresh ? 'רענון אוטומטי פעיל' : 'רענון אוטומטי כבוי'}
          >
            {autoRefresh ? (
              <Zap className="w-4 h-4" />
            ) : (
              <ZapOff className="w-4 h-4" />
            )}
            <span className="text-sm hidden sm:inline">
              {autoRefresh ? 'חי' : 'כבוי'}
            </span>
          </button>
          
          <button
            onClick={onSync}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
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
            {totals.profit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span>רווח</span>
          </div>
          <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.profit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm" title="אחוז רווח מההכנסות (רווח ÷ הכנסות × 100)">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1 cursor-help">
            <TrendingUp className="w-4 h-4" />
            <span>% רווח ממוצע</span>
          </div>
          <div className={`text-2xl font-bold ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(avgROI)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-100">
            <tr>
              {isColumnVisible('day') && <th className="px-4 py-3 text-right font-semibold text-gray-600 sticky right-0 bg-gray-100">יום</th>}
              {isColumnVisible('date') && <th className="px-4 py-3 text-right font-semibold text-gray-600">תאריך</th>}
              {isColumnVisible('revenue') && <th className="px-4 py-3 text-right font-semibold text-gray-600">הכנסות</th>}
              {isColumnVisible('ordersCount') && <th className="px-4 py-3 text-right font-semibold text-gray-600">מס' הזמנות</th>}
              {isColumnVisible('googleAdsCost') && <th className="px-4 py-3 text-right font-semibold text-gray-600">פרסום גוגל</th>}
              {isColumnVisible('facebookAdsCost') && <th className="px-4 py-3 text-right font-semibold text-gray-600">פרסום פייסבוק</th>}
              {isColumnVisible('tiktokAdsCost') && <th className="px-4 py-3 text-right font-semibold text-gray-600">פרסום טיקטוק</th>}
              {isColumnVisible('shippingCost') && <th className="px-4 py-3 text-right font-semibold text-gray-600">משלוח</th>}
              {isColumnVisible('materialsCost') && <th className="px-4 py-3 text-right font-semibold text-gray-600">חומרי גלם</th>}
              {isColumnVisible('creditCardFees') && <th className="px-4 py-3 text-right font-semibold text-gray-600">עמלת אשראי</th>}
              {isColumnVisible('vat') && <th className="px-4 py-3 text-right font-semibold text-gray-600">מע"מ</th>}
              {isColumnVisible('totalExpenses') && <th className="px-4 py-3 text-right font-semibold text-gray-600">סה"כ הוצאות</th>}
              {isColumnVisible('profit') && <th className="px-4 py-3 text-right font-semibold text-gray-600">רווח</th>}
              {isColumnVisible('roi') && <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-help" title="אחוז רווח מההכנסות (רווח ÷ הכנסות × 100)">% רווח</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.date} className={`border-b hover:bg-gray-50 group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                {isColumnVisible('day') && <td className="px-4 py-3 font-medium text-gray-900 sticky right-0 bg-inherit">{getDayName(row.date)}</td>}
                {isColumnVisible('date') && <td className="px-4 py-3 text-gray-600">{formatDate(row.date)}</td>}
                {isColumnVisible('revenue') && <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(row.revenue)}</td>}
                {isColumnVisible('ordersCount') && <td className="px-4 py-3 text-gray-600">{row.ordersCount}</td>}
                {isColumnVisible('googleAdsCost') && <td className="px-4 py-3 text-gray-600">{renderCell(row, 'googleAdsCost', row.googleAdsCost)}</td>}
                {isColumnVisible('facebookAdsCost') && <td className="px-4 py-3 text-gray-600">{renderCell(row, 'facebookAdsCost', row.facebookAdsCost)}</td>}
                {isColumnVisible('tiktokAdsCost') && <td className="px-4 py-3 text-gray-600">{renderCell(row, 'tiktokAdsCost', row.tiktokAdsCost || 0)}</td>}
                {isColumnVisible('shippingCost') && <td className="px-4 py-3 text-gray-600">{formatCurrency(row.shippingCost)}</td>}
                {isColumnVisible('materialsCost') && <td className="px-4 py-3 text-gray-600">{renderCell(row, 'materialsCost', row.materialsCost)}</td>}
                {isColumnVisible('creditCardFees') && <td className="px-4 py-3 text-gray-600">{formatCurrency(row.creditCardFees)}</td>}
                {isColumnVisible('vat') && <td className="px-4 py-3 text-gray-600">{formatCurrency(row.vat)}</td>}
                {isColumnVisible('totalExpenses') && <td className="px-4 py-3 font-medium text-red-600">{formatCurrency(row.totalExpenses)}</td>}
                {isColumnVisible('profit') && <td className={`px-4 py-3 font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(row.profit)}</td>}
                {isColumnVisible('roi') && <td className={`px-4 py-3 font-medium ${row.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(row.roi)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              {isColumnVisible('day') && <td className="px-4 py-3 sticky right-0 bg-gray-100">סה"כ</td>}
              {isColumnVisible('date') && <td className="px-4 py-3"></td>}
              {isColumnVisible('revenue') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.revenue)}</td>}
              {isColumnVisible('ordersCount') && <td className="px-4 py-3 text-gray-900">{totals.ordersCount}</td>}
              {isColumnVisible('googleAdsCost') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.googleAdsCost)}</td>}
              {isColumnVisible('facebookAdsCost') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.facebookAdsCost)}</td>}
              {isColumnVisible('tiktokAdsCost') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.tiktokAdsCost || 0)}</td>}
              {isColumnVisible('shippingCost') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.shippingCost)}</td>}
              {isColumnVisible('materialsCost') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.materialsCost)}</td>}
              {isColumnVisible('creditCardFees') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.creditCardFees)}</td>}
              {isColumnVisible('vat') && <td className="px-4 py-3 text-gray-900">{formatCurrency(totals.vat)}</td>}
              {isColumnVisible('totalExpenses') && <td className="px-4 py-3 text-red-600">{formatCurrency(totals.totalExpenses)}</td>}
              {isColumnVisible('profit') && <td className={`px-4 py-3 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.profit)}</td>}
              {isColumnVisible('roi') && <td className={`px-4 py-3 ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(avgROI)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
