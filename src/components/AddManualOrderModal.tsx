'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Package, User, CreditCard, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface ManualOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  supplier_name: string;
}

interface AddManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  businessId: string;
  onOrderAdded: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'מזומן' },
  { value: 'credit', label: 'כרטיס אשראי' },
  { value: 'bit', label: 'ביט' },
  { value: 'paybox', label: 'פייבוקס' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'check', label: 'צ\'ק' },
  { value: 'other', label: 'אחר' },
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'הושלמה' },
  { value: 'processing', label: 'בטיפול' },
  { value: 'pending', label: 'ממתינה' },
  { value: 'on-hold', label: 'בהמתנה' },
];

export default function AddManualOrderModal({ isOpen, onClose, date, businessId, onOrderAdded }: AddManualOrderModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Order details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [status, setStatus] = useState('completed');
  const [shippingTotal, setShippingTotal] = useState('0');
  const [notes, setNotes] = useState('');
  
  // Order items
  const [items, setItems] = useState<ManualOrderItem[]>([
    { id: crypto.randomUUID(), product_name: '', quantity: 1, unit_price: 0, unit_cost: 0, supplier_name: '' }
  ]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), product_name: '', quantity: 1, unit_price: 0, unit_cost: 0, supplier_name: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ManualOrderItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateItemTotal = (item: ManualOrderItem) => {
    return item.quantity * item.unit_price;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + parseFloat(shippingTotal || '0');
  };

  const calculateTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const calculateProfit = () => {
    return calculateTotal() - calculateTotalCost() - parseFloat(shippingTotal || '0');
  };

  const handleSubmit = async () => {
    // Validation
    if (items.every(item => !item.product_name.trim())) {
      setError('נא להזין לפחות פריט אחד');
      return;
    }

    // Filter out empty items
    const validItems = items.filter(item => item.product_name.trim());
    
    if (validItems.length === 0) {
      setError('נא להזין לפחות פריט אחד');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/manual-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          order_date: date,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          payment_method: paymentMethod,
          status,
          shipping_total: parseFloat(shippingTotal || '0'),
          total: calculateTotal(),
          notes,
          items: validItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: calculateItemTotal(item),
            unit_cost: item.unit_cost,
            supplier_name: item.supplier_name
          }))
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה בשמירת ההזמנה');
      }

      onOrderAdded();
      onClose();
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setPaymentMethod('cash');
      setStatus('completed');
      setShippingTotal('0');
      setNotes('');
      setItems([{ id: crypto.randomUUID(), product_name: '', quantity: 1, unit_price: 0, unit_cost: 0, supplier_name: '' }]);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">הוספת הזמנה ידנית</h2>
              <p className="text-green-100 text-xs">{formatDate(date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              פרטי לקוח (אופציונלי)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="שם לקוח"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="טלפון"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="אימייל"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                פריטים
              </h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
              >
                <Plus className="w-3 h-3" />
                הוסף פריט
              </button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                <div className="col-span-4">שם מוצר</div>
                <div className="col-span-1 text-center">כמות</div>
                <div className="col-span-2 text-center">מחיר יחידה</div>
                <div className="col-span-2 text-center">עלות יחידה</div>
                <div className="col-span-2 text-center">ספק</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <input
                    type="text"
                    value={item.product_name}
                    onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                    placeholder="שם המוצר"
                    className="col-span-4 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-green-500 outline-none"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    className="col-span-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-green-500 outline-none text-center"
                  />
                  <input
                    type="number"
                    value={item.unit_price || ''}
                    onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="₪"
                    className="col-span-2 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-green-500 outline-none text-center"
                  />
                  <input
                    type="number"
                    value={item.unit_cost || ''}
                    onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                    placeholder="₪"
                    className="col-span-2 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-green-500 outline-none text-center"
                  />
                  <input
                    type="text"
                    value={item.supplier_name}
                    onChange={(e) => updateItem(item.id, 'supplier_name', e.target.value)}
                    placeholder="ספק"
                    className="col-span-2 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-green-500 outline-none"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">אמצעי תשלום</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 outline-none"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">סטטוס</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 outline-none"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">משלוח</label>
              <input
                type="number"
                value={shippingTotal}
                onChange={(e) => setShippingTotal(e.target.value)}
                placeholder="₪0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות להזמנה..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 outline-none resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">סכום פריטים:</span>
              <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">משלוח:</span>
              <span className="font-medium">{formatCurrency(parseFloat(shippingTotal || '0'))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">עלות סחורה:</span>
              <span className="font-medium text-red-600">-{formatCurrency(calculateTotalCost())}</span>
            </div>
            <div className="border-t border-green-200 pt-2 flex justify-between">
              <span className="font-semibold text-gray-700">סה"כ:</span>
              <span className="font-bold text-green-700">{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">רווח משוער:</span>
              <span className={`font-semibold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calculateProfit())}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-between items-center bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור הזמנה
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
