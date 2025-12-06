'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Loader2, 
  Copy, 
  Save,
  AlertCircle,
  Calculator,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

/**
 * EmployeesManager - קומפוננטה לניהול עובדים ושכר
 * 
 * מציגה רשימת עובדים לחודש נבחר
 * מאפשרת הוספה, עריכה, מחיקה והעתקה מחודש קודם
 * מחשבת אוטומטית את העלות היומית
 */

interface Employee {
  id: string;
  name: string;
  salary: number;
  month: number;
  year: number;
}

interface EmployeesManagerProps {
  month: number; // 0-11
  year: number;
  onTotalChange?: (dailyCost: number) => void;
}

export default function EmployeesManager({ month, year, onTotalChange }: EmployeesManagerProps) {
  const { currentBusiness } = useAuth();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New employee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', salary: '' });
  
  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: '', salary: '' });
  
  // Totals
  const [totalSalary, setTotalSalary] = useState(0);
  const [dailyCost, setDailyCost] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(30);

  // Fetch employees when month/year/business changes
  useEffect(() => {
    if (currentBusiness?.id) {
      fetchEmployees();
    }
  }, [currentBusiness?.id, month, year]);

  // Notify parent of total change
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(dailyCost);
    }
  }, [dailyCost, onTotalChange]);

  const fetchEmployees = async () => {
    if (!currentBusiness?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `/api/employees?businessId=${currentBusiness.id}&month=${month + 1}&year=${year}`
      );
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch employees');
      }
      
      setEmployees(json.employees || []);
      setTotalSalary(json.totalSalary || 0);
      setDailyCost(json.dailyCost || 0);
      setDaysInMonth(json.daysInMonth || 30);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.salary || !currentBusiness?.id) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          name: newEmployee.name,
          salary: parseFloat(newEmployee.salary),
          month: month + 1,
          year,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add employee');
      }
      
      setNewEmployee({ name: '', salary: '' });
      setShowAddForm(false);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmployee = async (id: string) => {
    if (!editValue.name || !editValue.salary) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          businessId: currentBusiness?.id,
          name: editValue.name,
          salary: parseFloat(editValue.salary),
          month: month + 1,
          year,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update employee');
      }
      
      setEditingId(null);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('האם למחוק את העובד?')) return;
    
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete employee');
      }
      
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyFromPreviousMonth = async () => {
    if (!currentBusiness?.id) return;
    
    if (!confirm('להעתיק את כל העובדים מהחודש הקודם?')) return;
    
    setCopying(true);
    setError(null);
    
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          targetMonth: month + 1,
          targetYear: year,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to copy employees');
      }
      
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCopying(false);
    }
  };

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditValue({ name: employee.name, salary: employee.salary.toString() });
  };

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-500">טוען עובדים...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">ניהול עובדים</h3>
            <p className="text-sm text-gray-500">
              {monthNames[month]} {year}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFromPreviousMonth}
            disabled={copying}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {copying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            העתק מחודש קודם
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            הוסף עובד
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-indigo-900">עובד חדש</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              placeholder="שם העובד"
              className="px-3 py-2 border rounded-lg"
              autoFocus
            />
            <input
              type="number"
              value={newEmployee.salary}
              onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
              placeholder="שכר חודשי (₪)"
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddEmployee}
              disabled={saving || !newEmployee.name || !newEmployee.salary}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewEmployee({ name: '', salary: '' }); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Employees Table */}
      {employees.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">אין עובדים לחודש זה</p>
          <p className="text-sm text-gray-400">הוסף עובדים או העתק מחודש קודם</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">שם העובד</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">שכר חודשי</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">עלות יומית</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingId === emp.id ? (
                      <input
                        type="text"
                        value={editValue.name}
                        onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{emp.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === emp.id ? (
                      <input
                        type="number"
                        value={editValue.salary}
                        onChange={(e) => setEditValue({ ...editValue, salary: e.target.value })}
                        className="w-24 px-2 py-1 border rounded text-center"
                      />
                    ) : (
                      <span 
                        className="text-indigo-600 font-medium cursor-pointer hover:bg-indigo-50 px-2 py-1 rounded"
                        onClick={() => startEdit(emp)}
                      >
                        {formatCurrency(emp.salary)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-500">
                      {formatCurrency(emp.salary / daysInMonth)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === emp.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdateEmployee(emp.id)}
                          disabled={saving}
                          className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {employees.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">סה"כ עובדים</p>
              <p className="text-xl font-bold text-indigo-600">{employees.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">סה"כ שכר חודשי</p>
              <p className="text-xl font-bold text-indigo-600">{formatCurrency(totalSalary)}</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-sm text-gray-600">עלות יומית</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(dailyCost)}</p>
              <p className="text-xs text-gray-400">({daysInMonth} ימים בחודש)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
