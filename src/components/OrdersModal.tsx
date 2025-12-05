'use client';

import { useState, useEffect } from 'react';
import { X, Package, Loader2, ExternalLink, User, MapPin, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface Order {
  id: number;
  status: string;
  total: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    city: string;
    address_1: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
  payment_method_title: string;
  shipping_total: string;
}

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  orders: Order[];
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'completed': { label: 'הושלמה', color: 'bg-green-100 text-green-700' },
  'processing': { label: 'בטיפול', color: 'bg-blue-100 text-blue-700' },
  'on-hold': { label: 'בהמתנה', color: 'bg-yellow-100 text-yellow-700' },
  'pending': { label: 'ממתינה', color: 'bg-gray-100 text-gray-700' },
  'cancelled': { label: 'בוטלה', color: 'bg-red-100 text-red-700' },
  'refunded': { label: 'הוחזרה', color: 'bg-purple-100 text-purple-700' },
  'failed': { label: 'נכשלה', color: 'bg-red-100 text-red-700' },
};

export default function OrdersModal({ isOpen, onClose, date, orders, isLoading }: OrdersModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6" />
                הזמנות ליום {formatDate(date)}
              </h2>
              <p className="text-blue-100 mt-1">
                {orders.length} הזמנות | סה"כ {formatCurrency(totalRevenue)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין הזמנות ליום זה</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">#{order.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_LABELS[order.status]?.color || 'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_LABELS[order.status]?.label || order.status}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {formatTime(order.date_created)}
                      </span>
                    </div>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(parseFloat(order.total))}
                    </span>
                  </div>

                  {/* Customer info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{order.billing.first_name} {order.billing.last_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{order.shipping.city || order.billing.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span>{order.payment_method_title}</span>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">פריטים:</p>
                    <div className="space-y-1">
                      {order.line_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.name} <span className="text-gray-400">x{item.quantity}</span>
                          </span>
                          <span className="font-medium">{formatCurrency(parseFloat(item.total))}</span>
                        </div>
                      ))}
                      {parseFloat(order.shipping_total) > 0 && (
                        <div className="flex justify-between text-sm text-gray-500 pt-1 border-t">
                          <span>משלוח</span>
                          <span>{formatCurrency(parseFloat(order.shipping_total))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              מציג {orders.length} הזמנות
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
