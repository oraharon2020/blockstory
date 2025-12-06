'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Package, Loader2, User, MapPin, CreditCard, Save, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface LineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  total: string;
  meta_data?: Array<{
    id: number;
    key: string;
    value: string;
    display_key?: string;
    display_value?: string;
  }>;
}

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
  line_items: LineItem[];
  payment_method_title: string;
  shipping_total: string;
}

interface ProductCost {
  product_id: number | null;
  product_name: string;
  unit_cost: number;
}

interface OrderItemCost {
  order_id: number;
  line_item_id: number;
  item_cost: number;
}

interface ItemCostState {
  cost: string;
  saved: boolean;
  saving: boolean;
  isDefault: boolean;
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

// Get variations from meta_data (filter out internal WooCommerce keys)
const getItemVariations = (item: LineItem): string[] => {
  if (!item.meta_data) return [];
  
  // Filter out internal keys that start with _ or are system keys
  const variations = item.meta_data
    .filter(meta => 
      !meta.key.startsWith('_') && 
      meta.value && 
      typeof meta.value === 'string' &&
      meta.key !== 'order_item_id'
    )
    .map(meta => {
      const key = meta.display_key || meta.key;
      const value = meta.display_value || meta.value;
      return `${key}: ${value}`;
    });
  
  return variations;
};

export default function OrdersModal({ isOpen, onClose, date, orders, isLoading }: OrdersModalProps) {
  const [productCosts, setProductCosts] = useState<Map<string, number>>(new Map());
  const [itemCostStates, setItemCostStates] = useState<Map<string, ItemCostState>>(new Map());
  const [loadingCosts, setLoadingCosts] = useState(false);

  // Load product costs and order item costs
  const loadCosts = useCallback(async () => {
    if (!orders.length) return;
    
    setLoadingCosts(true);
    try {
      // Load default product costs
      const productRes = await fetch('/api/product-costs');
      const productJson = await productRes.json();
      
      const costMap = new Map<string, number>();
      if (productJson.data) {
        productJson.data.forEach((p: ProductCost) => {
          costMap.set(p.product_name, p.unit_cost);
          if (p.product_id) {
            costMap.set(`id_${p.product_id}`, p.unit_cost);
          }
        });
      }
      setProductCosts(costMap);

      // Load saved order item costs
      const orderItemMap = new Map<string, number>();
      for (const order of orders) {
        try {
          const itemRes = await fetch(`/api/order-item-costs?orderId=${order.id}`);
          const itemJson = await itemRes.json();
          if (itemJson.data) {
            itemJson.data.forEach((item: OrderItemCost) => {
              orderItemMap.set(`${item.order_id}_${item.line_item_id}`, item.item_cost);
            });
          }
        } catch (e) {
          console.error('Error loading order item costs:', e);
        }
      }

      // Initialize item cost states
      const stateMap = new Map<string, ItemCostState>();
      orders.forEach(order => {
        order.line_items.forEach(item => {
          const key = `${order.id}_${item.id}`;
          const savedCost = orderItemMap.get(key);
          const defaultCost = costMap.get(item.name) || costMap.get(`id_${item.product_id}`);
          
          stateMap.set(key, {
            cost: savedCost !== undefined ? savedCost.toString() : (defaultCost !== undefined ? defaultCost.toString() : ''),
            saved: savedCost !== undefined,
            saving: false,
            isDefault: savedCost === undefined && defaultCost !== undefined,
          });
        });
      });
      setItemCostStates(stateMap);

    } catch (error) {
      console.error('Error loading costs:', error);
    } finally {
      setLoadingCosts(false);
    }
  }, [orders]);

  useEffect(() => {
    if (isOpen && orders.length > 0) {
      loadCosts();
    }
  }, [isOpen, orders, loadCosts]);

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

  const handleCostChange = (orderId: number, itemId: number, value: string) => {
    const key = `${orderId}_${itemId}`;
    const current = itemCostStates.get(key);
    if (current) {
      setItemCostStates(new Map(itemCostStates.set(key, { 
        ...current, 
        cost: value,
        saved: false,
      })));
    }
  };

  const saveCost = async (order: Order, item: LineItem, saveAsDefault: boolean = false) => {
    const key = `${order.id}_${item.id}`;
    const state = itemCostStates.get(key);
    if (!state || state.saving) return;

    setItemCostStates(new Map(itemCostStates.set(key, { ...state, saving: true })));

    // Extract the date from order.date_created (format: "2025-12-05T10:30:00")
    const orderDate = order.date_created.split('T')[0];

    try {
      const res = await fetch('/api/order-item-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          line_item_id: item.id,
          product_id: item.product_id,
          product_name: item.name,
          item_cost: parseFloat(state.cost) || 0,
          save_as_default: saveAsDefault,
          order_date: orderDate,
        }),
      });

      if (res.ok) {
        setItemCostStates(new Map(itemCostStates.set(key, { 
          ...state, 
          saving: false, 
          saved: true,
          isDefault: false,
        })));

        // If saved as default, update local product costs map
        if (saveAsDefault) {
          setProductCosts(new Map(productCosts.set(item.name, parseFloat(state.cost) || 0)));
        }
      }
    } catch (error) {
      console.error('Error saving cost:', error);
      setItemCostStates(new Map(itemCostStates.set(key, { ...state, saving: false })));
    }
  };

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

  const calculateOrderProfit = (order: Order) => {
    let totalCost = 0;
    let hasMissingCosts = false;

    order.line_items.forEach(item => {
      const key = `${order.id}_${item.id}`;
      const state = itemCostStates.get(key);
      if (state && state.cost) {
        totalCost += parseFloat(state.cost) || 0;
      } else {
        hasMissingCosts = true;
      }
    });

    const revenue = parseFloat(order.total);
    const shipping = parseFloat(order.shipping_total || '0');
    const profit = revenue - totalCost - shipping;

    return { profit, totalCost, hasMissingCosts };
  };

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
  
  // Calculate total profit
  let totalProfit = 0;
  let hasAnyMissingCosts = false;
  orders.forEach(order => {
    const { profit, hasMissingCosts } = calculateOrderProfit(order);
    totalProfit += profit;
    if (hasMissingCosts) hasAnyMissingCosts = true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6" />
                הזמנות ליום {formatDate(date)}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-blue-100">
                  {orders.length} הזמנות | סה"כ {formatCurrency(totalRevenue)}
                </p>
                {!loadingCosts && (
                  <p className={`flex items-center gap-1 ${hasAnyMissingCosts ? 'text-yellow-200' : 'text-green-200'}`}>
                    <TrendingUp className="w-4 h-4" />
                    רווח: {formatCurrency(totalProfit)}
                    {hasAnyMissingCosts && <AlertCircle className="w-4 h-4" />}
                  </p>
                )}
              </div>
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
          {isLoading || loadingCosts ? (
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
              {orders.map((order) => {
                const { profit, hasMissingCosts } = calculateOrderProfit(order);
                
                return (
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
                      <div className="text-left">
                        <span className="font-bold text-lg text-green-600 block">
                          {formatCurrency(parseFloat(order.total))}
                        </span>
                        <span className={`text-sm ${hasMissingCosts ? 'text-yellow-600' : 'text-blue-600'}`}>
                          רווח: {formatCurrency(profit)}
                          {hasMissingCosts && ' *'}
                        </span>
                      </div>
                    </div>

                    {/* Customer info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
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

                    {/* Line items with cost inputs */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">פריטים:</p>
                      <div className="space-y-2">
                        {order.line_items.map((item) => {
                          const key = `${order.id}_${item.id}`;
                          const state = itemCostStates.get(key);
                          const itemProfit = state?.cost 
                            ? parseFloat(item.total) - parseFloat(state.cost)
                            : null;

                          return (
                            <div key={item.id} className="flex items-center justify-between gap-2 text-sm bg-white p-2 rounded-lg">
                              <div className="flex-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-400 mr-2">x{item.quantity}</span>
                                {/* Show variations */}
                                {getItemVariations(item).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {getItemVariations(item).map((variation, idx) => (
                                      <span 
                                        key={idx} 
                                        className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
                                      >
                                        {variation}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Cost input */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">עלות:</span>
                                  <input
                                    type="number"
                                    value={state?.cost || ''}
                                    onChange={(e) => handleCostChange(order.id, item.id, e.target.value)}
                                    placeholder="₪"
                                    className={`w-20 px-2 py-1 text-sm border rounded text-center ${
                                      state?.isDefault ? 'border-blue-300 bg-blue-50' : 
                                      state?.saved ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                    }`}
                                  />
                                </div>
                                
                                {/* Save button */}
                                <button
                                  onClick={() => saveCost(order, item, false)}
                                  disabled={!state?.cost || state?.saving}
                                  className={`p-1.5 rounded transition-colors ${
                                    state?.saved 
                                      ? 'bg-green-100 text-green-600' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                                  } disabled:opacity-50`}
                                  title="שמור עלות להזמנה זו"
                                >
                                  {state?.saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Save as default button */}
                                {state?.cost && !state?.isDefault && (
                                  <button
                                    onClick={() => saveCost(order, item, true)}
                                    disabled={state?.saving}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                    title="שמור כברירת מחדל למוצר זה"
                                  >
                                    ברירת מחדל
                                  </button>
                                )}

                                {/* Item total and profit */}
                                <div className="text-left min-w-[80px]">
                                  <span className="font-medium block">{formatCurrency(parseFloat(item.total))}</span>
                                  {itemProfit !== null && (
                                    <span className={`text-xs ${itemProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      רווח: {formatCurrency(itemProfit)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {parseFloat(order.shipping_total) > 0 && (
                          <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                            <span>משלוח</span>
                            <span>{formatCurrency(parseFloat(order.shipping_total))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span>מציג {orders.length} הזמנות</span>
              {hasAnyMissingCosts && (
                <span className="text-yellow-600 mr-2">* חסרות עלויות לחלק מהמוצרים</span>
              )}
            </div>
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
