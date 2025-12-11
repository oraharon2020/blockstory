'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
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
  Calendar,
  Pencil,
  Check,
  X
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
  role?: string;
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
  
  // New employee form - inline like expenses
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', salary: '' });
  
  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: '', role: '', salary: '' });
  
  // Totals
  const [totalSalary, setTotalSalary] = useState(0);
  const [dailyCost, setDailyCost] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(30);

  // Refs for quick entry
  const nameRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const salaryRef = useRef<HTMLInputElement>(null);

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
        `/api/employees?businessId=${currentBusiness.id}&month=${month}&year=${year}`
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
          role: newEmployee.role || '',
          salary: parseFloat(newEmployee.salary),
          month: month,
          year,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add employee');
      }
      
      setNewEmployee({ name: '', role: '', salary: '' });
      fetchEmployees();
      // Focus back on name for quick next entry
      nameRef.current?.focus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget === salaryRef.current) {
        // On Enter in salary field, submit
        handleAddEmployee();
      } else if (nextRef?.current) {
        nextRef.current.focus();
      }
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
          role: editValue.role || '',
          salary: parseFloat(editValue.salary),
          month: month,
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
          targetMonth: month,
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
    setEditValue({ name: employee.name, role: employee.role || '', salary: employee.salary.toString() });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue({ name: '', role: '', salary: '' });
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
    <div className="flex-1 overflow-auto" dir="rtl">
      {/* Quick Add Row - Always visible like expenses */}
      <div className="bg-indigo-50/50 border-b p-3">
        <div className="flex items-center gap-2">
          <input
            ref={nameRef}
            type="text"
            value={newEmployee.name}
            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, roleRef)}
            placeholder="שם העובד"
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            ref={roleRef}
            type="text"
            value={newEmployee.role}
            onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, salaryRef)}
            placeholder="תפקיד (אופציונלי)"
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="relative">
            <input
              ref={salaryRef}
              type="number"
              value={newEmployee.salary}
              onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e)}
              placeholder="שכר חודשי"
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left"
              dir="ltr"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₪</span>
          </div>
          <button
            onClick={handleAddEmployee}
            disabled={saving || !newEmployee.name || !newEmployee.salary}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            הוסף
          </button>
          <button
            onClick={handleCopyFromPreviousMonth}
            disabled={copying}
            className="px-3 py-2 text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 text-sm"
            title="העתק מחודש קודם"
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            העתק
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          💡 Enter לעבור לשדה הבא, Enter בשכר להוספה מהירה
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mx-3 mt-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employees Table */}
      {employees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">אין עובדים לחודש זה</p>
          <p className="text-sm text-gray-400 mt-1">הוסף עובדים או העתק מחודש קודם</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">שם</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">תפקיד</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">שכר חודשי</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">עלות יומית</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === emp.id ? (
                    // Edit mode
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editValue.name}
                          onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editValue.role}
                          onChange={(e) => setEditValue({ ...editValue, role: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm"
                          placeholder="תפקיד"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={editValue.salary}
                          onChange={(e) => setEditValue({ ...editValue, salary: e.target.value })}
                          className="w-24 px-2 py-1.5 border rounded-lg text-sm text-center"
                          dir="ltr"
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-gray-400 text-sm">
                        {formatCurrency(parseFloat(editValue.salary || '0') / daysInMonth)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateEmployee(emp.id)}
                            disabled={saving}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View mode
                    <>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{emp.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {emp.role || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className="text-indigo-600 font-semibold cursor-pointer hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                          onClick={() => startEdit(emp)}
                        >
                          {formatCurrency(emp.salary)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-sm">
                        {formatCurrency(emp.salary / daysInMonth)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(emp)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      {employees.length > 0 && (
        <div className="border-t bg-gradient-to-r from-indigo-50 to-purple-50 p-4 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500">סה"כ עובדים</p>
                <p className="text-lg font-bold text-indigo-600">{employees.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">סה"כ שכר חודשי</p>
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(totalSalary)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
              <p className="text-xs text-gray-500">עלות יומית</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(dailyCost)}</p>
              <p className="text-xs text-gray-400">({daysInMonth} ימים)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
