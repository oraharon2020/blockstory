'use client';

import { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  Package,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { SupplierOrder } from './types';

interface OrdersTableProps {
  orders: SupplierOrder[];
  loading: boolean;
  onUpdateOrder: (orderId: number, itemId: number, updates: Partial<SupplierOrder>) => Promise<boolean>;
  onToggleReady: (orderId: number, itemId: number, currentStatus: boolean) => Promise<boolean>;
}

export default function OrdersTable({
  orders,
  loading,
  onUpdateOrder,
  onToggleReady,
}: OrdersTableProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null); // "orderId-itemId"
  const [editValues, setEditValues] = useState<{ cost: string; notes: string }>({ cost: '', notes: '' });
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  const handleStartEdit = (order: SupplierOrder) => {
    const key = `${order.order_id}-${order.item_id}`;
    setEditingItem(key);
    setEditValues({
      cost: (order.adjusted_cost ?? order.unit_cost ?? 0).toString(),
      notes: order.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({ cost: '', notes: '' });
  };

  const handleSave = async (order: SupplierOrder) => {
    const key = `${order.order_id}-${order.item_id}`;
    setSavingItem(key);
    
    const newCost = parseFloat(editValues.cost) || 0;
    
    // Save unit_cost (syncs with OrdersModal popup) and adjusted_cost
    const success = await onUpdateOrder(order.order_id, order.item_id, {
      unit_cost: newCost,
      adjusted_cost: newCost,
      notes: editValues.notes || null,
      // Include required fields for insert
      product_name: order.product_name,
      product_id: order.product_id,
      supplier_name: order.supplier_name,
      quantity: order.quantity,
      order_date: order.order_date,
    });
    
    if (success) {
      setEditingItem(null);
      setEditValues({ cost: '', notes: '' });
    }
    
    setSavingItem(null);
  };

  const handleToggleReady = async (order: SupplierOrder) => {
    const key = `${order.order_id}-${order.item_id}`;
    setTogglingItem(key);
    await onToggleReady(order.order_id, order.item_id, order.is_ready);
    setTogglingItem(null);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded border p-6 flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-500 text-xs">טוען הזמנות...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded border p-6 flex flex-col items-center justify-center">
        <Package className="w-10 h-10 text-gray-200 mb-2" />
        <h3 className="text-sm font-medium text-gray-600 mb-1">אין הזמנות</h3>
        <p className="text-xs text-gray-400 text-center">לא נמצאו הזמנות לסינון הנבחר</p>
      </div>
    );
  }

  // Group orders by order_id
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.order_id]) {
      acc[order.order_id] = [];
    }
    acc[order.order_id].push(order);
    return acc;
  }, {} as Record<number, SupplierOrder[]>);

  return (
    <div className="bg-white rounded border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600 w-8"></th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">מס׳</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">תאריך</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">מוצר</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">וריאציה</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600">כמות</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600">עלות</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600">מתוקן</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600">סה״כ</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">הערות</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600 w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {Object.entries(groupedOrders).map(([orderId, orderItems]) => (
              orderItems.map((order, itemIndex) => {
                const key = `${order.order_id}-${order.item_id}`;
                const isEditing = editingItem === key;
                const isSaving = savingItem === key;
                const isToggling = togglingItem === key;
                const effectiveCost = order.adjusted_cost ?? order.unit_cost ?? 0;
                const totalCost = effectiveCost * (order.quantity || 1);
                const isFirstInOrder = itemIndex === 0;
                const orderItemCount = orderItems.length;

                return (
                  <tr 
                    key={key} 
                    className={`hover:bg-gray-50 transition-colors ${
                      order.is_ready ? 'bg-green-50/50' : ''
                    }`}
                  >
                    {/* Ready Status */}
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleToggleReady(order)}
                        disabled={isToggling}
                        className={`p-1 rounded transition-all ${
                          order.is_ready 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : order.is_ready ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    {/* Order ID */}
                    <td className="px-2 py-1.5">
                      {isFirstInOrder ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-blue-600">#{order.order_id}</span>
                          {orderItemCount > 1 && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                              {orderItemCount}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">↳</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-2 py-1.5 text-gray-600">
                      {formatDate(order.order_date)}
                    </td>

                    {/* Product Name */}
                    <td className="px-2 py-1.5">
                      <span className="font-medium text-gray-800 truncate max-w-[150px] block">{order.product_name}</span>
                    </td>

                    {/* Variation */}
                    <td className="px-2 py-1.5">
                      {order.variation_key ? (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {order.variation_key}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-2 py-1.5 text-center">
                      <span className="font-medium">{order.quantity || 1}</span>
                    </td>

                    {/* Base Cost */}
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-gray-500">{formatCurrency(order.unit_cost)}</span>
                    </td>

                    {/* Adjusted Cost */}
                    <td className="px-2 py-1.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.cost}
                          onChange={(e) => setEditValues({ ...editValues, cost: e.target.value })}
                          className="w-16 px-1.5 py-1 text-xs border border-blue-300 rounded text-center focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : order.adjusted_cost !== null && order.adjusted_cost !== undefined ? (
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(order.adjusted_cost)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-2 py-1.5 text-center">
                      <span className="font-bold text-green-600">{formatCurrency(totalCost)}</span>
                    </td>

                    {/* Notes */}
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.notes}
                          onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                          placeholder="הערות..."
                          className="w-full px-1.5 py-1 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : order.notes ? (
                        <div className="flex items-center gap-0.5 text-gray-600">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span className="max-w-[100px] truncate">{order.notes}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-0.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSave(order)}
                              disabled={isSaving}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(order)}
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
