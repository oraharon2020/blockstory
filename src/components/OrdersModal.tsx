'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Package, Loader2, User, MapPin, CreditCard, Save, TrendingUp, AlertCircle, Building2, ChevronDown, ChevronUp, Star, Check, ChevronsUpDown, Plus, Truck, StickyNote } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { useAuth } from '@/contexts/AuthContext';

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
  supplier_name?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface OrderItemCost {
  order_id: number;
  line_item_id: number;
  item_cost: number;
  quantity?: number;
  shipping_cost?: number;
  supplier_name?: string;
  supplier_id?: string;
  is_ready?: boolean;
  notes?: string;
}

interface ItemCostState {
  cost: string;
  quantity: string;
  shippingCost: string;
  supplier: string;
  supplierId: string;
  variationKey: string;
  saved: boolean;
  saving: boolean;
  isDefault: boolean;
  isVariationCost: boolean; // האם העלות מגיעה מוריאציה ספציפית
  isReady: boolean; // האם מסומן כמוכן
  note: string; // הערה לפריט
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

// Get variations from meta_data (filter out internal WooCommerce keys and HTML content)
const getItemVariations = (item: LineItem): string[] => {
  if (!item.meta_data) return [];
  
  // Filter out internal keys, system keys, and HTML content
  const variations = item.meta_data
    .filter(meta => {
      // Skip if no value or not a string
      if (!meta.value || typeof meta.value !== 'string') return false;
      
      // Skip internal keys starting with _
      if (meta.key.startsWith('_')) return false;
      
      // Skip system keys
      if (meta.key === 'order_item_id') return false;
      
      // Skip HTML content (images, divs, etc.)
      const value = meta.value.toLowerCase();
      if (value.includes('<img') || 
          value.includes('<div') || 
          value.includes('<a ') ||
          value.includes('<figure') ||
          value.includes('href=') ||
          value.includes('.jpg') ||
          value.includes('.png') ||
          value.includes('.gif') ||
          value.includes('gf-download')) {
        return false;
      }
      
      // Skip very long values (likely HTML or encoded data)
      if (meta.value.length > 100) return false;
      
      return true;
    })
    .map(meta => {
      let key = meta.display_key || meta.key;
      let value = meta.display_value || meta.value;
      
      // Decode HTML entities in both key and value
      const decodeHtml = (str: string) => str
        .replace(/&#8362;/g, '₪')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');
      
      key = decodeHtml(key);
      value = decodeHtml(value);
      
      return `${key}: ${value}`;
    });
  
  return variations;
};

// Create a unique variation key from item variations
const getVariationKey = (item: LineItem): string => {
  const variations = getItemVariations(item);
  if (variations.length === 0) return '';
  // Sort for consistency and join
  const key = variations.sort().join(' | ');
  
  return key;
};

// Get variation attributes as object for saving
const getVariationAttributes = (item: LineItem): Record<string, string> | null => {
  if (!item.meta_data) return null;
  
  const attrs: Record<string, string> = {};
  item.meta_data
    .filter(meta => {
      if (!meta.value || typeof meta.value !== 'string') return false;
      if (meta.key.startsWith('_')) return false;
      if (meta.key === 'order_item_id') return false;
      if (meta.value.length > 100) return false;
      const value = meta.value.toLowerCase();
      if (value.includes('<') || value.includes('href=')) return false;
      return true;
    })
    .forEach(meta => {
      const key = meta.display_key || meta.key;
      const value = meta.display_value || meta.value;
      attrs[key] = value;
    });
  
  return Object.keys(attrs).length > 0 ? attrs : null;
};

export default function OrdersModal({ isOpen, onClose, date, orders, isLoading }: OrdersModalProps) {
  const { currentBusiness } = useAuth();
  const [productCosts, setProductCosts] = useState<Map<string, ProductCost>>(new Map());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemCostStates, setItemCostStates] = useState<Map<string, ItemCostState>>(new Map());
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [manualShippingPerItem, setManualShippingPerItem] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  
  // VAT settings for shipping
  const [vatRate, setVatRate] = useState(18);
  const [addVatToShipping, setAddVatToShipping] = useState(true);
  
  // Add supplier state
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);

  // Toggle single order expansion
  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Expand all orders
  const expandAll = () => {
    setExpandedOrders(new Set(orders.map(o => o.id)));
  };

  // Collapse all orders
  const collapseAll = () => {
    setExpandedOrders(new Set());
  };

  // Add new supplier
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim() || !currentBusiness?.id) return;
    
    setAddingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_supplier',
          name: newSupplierName.trim(),
          businessId: currentBusiness.id,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add new supplier to list
        setSuppliers(prev => [...prev, { id: data.supplier.id, name: data.supplier.name }]);
        setNewSupplierName('');
        setShowAddSupplier(false);
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
    } finally {
      setAddingSupplier(false);
    }
  };

  // Load business settings to check if manual shipping is enabled
  useEffect(() => {
    const loadBusinessSettings = async () => {
      if (!currentBusiness?.id) return;
      try {
        const res = await fetch(`/api/business-settings?businessId=${currentBusiness.id}`);
        const json = await res.json();
        if (json.data) {
          setManualShippingPerItem(json.data.manualShippingPerItem ?? false);
          setVatRate(json.data.vatRate ?? 18);
        }
      } catch (error) {
        console.error('Error loading business settings:', error);
      }
    };
    loadBusinessSettings();
  }, [currentBusiness?.id]);

  // Load product costs, suppliers, and order item costs
  const loadCosts = useCallback(async () => {
    if (!orders.length) return;
    
    setLoadingCosts(true);
    try {
      const params = new URLSearchParams();
      if (currentBusiness?.id) params.set('businessId', currentBusiness.id);
      
      // Load default product costs, variation costs, and suppliers in parallel
      const [productRes, suppliersRes, variationRes] = await Promise.all([
        fetch(`/api/product-costs?${params.toString()}`),
        fetch(`/api/suppliers?${params.toString()}`),
        fetch(`/api/product-variation-costs?${params.toString()}`),
      ]);
      
      const productJson = await productRes.json();
      const suppliersJson = await suppliersRes.json();
      const variationJson = await variationRes.json();
      
      setSuppliers(suppliersJson.suppliers || []);
      
      // Map for base product costs
      const costMap = new Map<string, ProductCost>();
      if (productJson.data) {
        productJson.data.forEach((p: ProductCost) => {
          costMap.set(p.product_name, p);
          if (p.product_id) {
            costMap.set(`id_${p.product_id}`, p);
          }
        });
      }
      setProductCosts(costMap);

      // Map for variation costs: key = "productId_variationKey"
      const variationCostMap = new Map<string, any>();
      if (variationJson.data) {
        // Sort so is_default=true comes last (will override non-default)
        const sortedData = [...variationJson.data].sort((a, b) => {
          if (a.is_default && !b.is_default) return 1;
          if (!a.is_default && b.is_default) return -1;
          // Prefer entries with supplier over entries without
          if (a.supplier_id && !b.supplier_id) return 1;
          if (!a.supplier_id && b.supplier_id) return -1;
          return 0;
        });
        
        sortedData.forEach((v: any) => {
          const vKey = `${v.product_id}_${v.variation_key || ''}`;
          // Always take the last one (which will be is_default=true with supplier if available)
          variationCostMap.set(vKey, v);
        });
      }

      // Load saved order item costs
      const orderItemMap = new Map<string, OrderItemCost>();
      for (const order of orders) {
        try {
          const itemRes = await fetch(`/api/order-item-costs?orderId=${order.id}&${params.toString()}`);
          const itemJson = await itemRes.json();
          if (itemJson.data) {
            itemJson.data.forEach((item: OrderItemCost) => {
              orderItemMap.set(`${item.order_id}_${item.line_item_id}`, item);
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
          const savedItem = orderItemMap.get(key);
          const variationKey = getVariationKey(item);
          
          // Priority: 1. Saved item cost, 2. Variation cost, 3. Base product cost
          let cost = '';
          let supplier = '';
          let supplierId = '';
          let isDefault = false;
          let isVariationCost = false;
          
          if (savedItem !== undefined) {
            cost = savedItem.item_cost.toString();
            supplier = savedItem.supplier_name || '';
            supplierId = savedItem.supplier_id || '';
          } else {
            // Try variation cost first
            const varCost = variationCostMap.get(`${item.product_id}_${variationKey}`);
            if (varCost) {
              cost = varCost.unit_cost.toString();
              supplier = varCost.supplier_name || '';
              supplierId = varCost.supplier_id || '';
              isDefault = true;
              isVariationCost = true;
            } else {
              // Fall back to base product cost
              const defaultCost = costMap.get(item.name) || costMap.get(`id_${item.product_id}`);
              if (defaultCost) {
                cost = defaultCost.unit_cost.toString();
                supplier = defaultCost.supplier_name || '';
                isDefault = true;
              }
            }
          }
          
          stateMap.set(key, {
            cost,
            quantity: savedItem?.quantity?.toString() || '1',
            shippingCost: savedItem?.shipping_cost?.toString() || '',
            supplier,
            supplierId,
            variationKey,
            saved: savedItem !== undefined,
            saving: false,
            isDefault,
            isVariationCost,
            isReady: savedItem?.is_ready || false,
            note: savedItem?.notes || '',
          });
        });
      });
      setItemCostStates(stateMap);

    } catch (error) {
      console.error('Error loading costs:', error);
    } finally {
      setLoadingCosts(false);
    }
  }, [orders, currentBusiness?.id]);

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

  const handleQuantityChange = (orderId: number, itemId: number, value: string) => {
    const key = `${orderId}_${itemId}`;
    const current = itemCostStates.get(key);
    if (current) {
      setItemCostStates(new Map(itemCostStates.set(key, { 
        ...current, 
        quantity: value,
        saved: false,
      })));
    }
  };

  const handleShippingCostChange = (orderId: number, itemId: number, value: string) => {
    const key = `${orderId}_${itemId}`;
    const current = itemCostStates.get(key);
    if (current) {
      setItemCostStates(new Map(itemCostStates.set(key, { 
        ...current, 
        shippingCost: value,
        saved: false,
      })));
    }
  };

  const handleNoteChange = (orderId: number, itemId: number, value: string) => {
    const key = `${orderId}_${itemId}`;
    const current = itemCostStates.get(key);
    if (current) {
      setItemCostStates(new Map(itemCostStates.set(key, { 
        ...current, 
        note: value,
        saved: false,
      })));
    }
  };

  // When supplier is selected, try to find if there's a saved cost for this product+variation+supplier combo
  const handleSupplierChange = async (orderId: number, itemId: number, supplierName: string, supplierId: string, item: LineItem) => {
    const key = `${orderId}_${itemId}`;
    const current = itemCostStates.get(key);
    if (!current) return;
    
    // Update supplier immediately
    setItemCostStates(new Map(itemCostStates.set(key, { 
      ...current, 
      supplier: supplierName,
      supplierId: supplierId,
      saved: false,
    })));
    
    // Try to find a saved cost for this product+variation+supplier from variation costs
    if (currentBusiness?.id && supplierId) {
      try {
        const variationKey = getVariationKey(item);
        const params = new URLSearchParams({
          businessId: currentBusiness.id,
          productId: item.product_id.toString(),
          variationKey: variationKey,
        });
        
        const res = await fetch(`/api/product-variation-costs?${params.toString()}`);
        const json = await res.json();
        
        // Find cost for this specific supplier
        const supplierCost = json.data?.find((v: any) => v.supplier_id === supplierId);
        
        if (supplierCost) {
          setItemCostStates(new Map(itemCostStates.set(key, { 
            ...current, 
            supplier: supplierName,
            supplierId: supplierId,
            cost: supplierCost.unit_cost.toString(),
            saved: false,
            isDefault: true,
            isVariationCost: true,
          })));
          return;
        }
      } catch (e) {
        console.error('Error loading variation cost:', e);
      }
    }
    
    // Fallback to base product cost
    const productCost = productCosts.get(item.name) || productCosts.get(`id_${item.product_id}`);
    if (productCost) {
      setItemCostStates(new Map(itemCostStates.set(key, { 
        ...current, 
        supplier: supplierName,
        supplierId: supplierId,
        cost: productCost.unit_cost.toString(),
        saved: false,
        isDefault: true,
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
    const variationKey = getVariationKey(item);
    const variationAttributes = getVariationAttributes(item);
    
    // Find supplier ID
    const selectedSupplier = state.supplierId 
      ? suppliers.find(s => s.id === state.supplierId)
      : suppliers.find(s => s.name === state.supplier);

    // Calculate total cost (unit cost * quantity)
    const unitCost = parseFloat(state.cost) || 0;
    const quantity = parseFloat(state.quantity) || 1;
    const totalItemCost = unitCost * quantity;
    
    // Shipping cost is always saved WITHOUT VAT
    // VAT will be calculated when displaying in the cashflow table
    const baseShippingCost = parseFloat(state.shippingCost) || 0;

    try {
      // Save to order_item_costs (save unit cost and quantity separately)
      // Note: shipping_cost is saved WITHOUT VAT - VAT is calculated in daily-costs API
      const res = await fetch('/api/order-item-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          line_item_id: item.id,
          product_id: item.product_id,
          product_name: item.name,
          item_cost: unitCost,
          quantity: quantity,
          shipping_cost: manualShippingPerItem ? baseShippingCost : null,
          supplier_name: state.supplier || null,
          supplier_id: selectedSupplier?.id || null,
          variation_key: variationKey || null,
          variation_attributes: variationAttributes,
          save_as_default: saveAsDefault,
          order_date: orderDate,
          businessId: currentBusiness?.id,
          notes: state.note || null,
        }),
      });

      if (res.ok) {
        // If saved as default, also save to product_variation_costs (save unit cost, not total)
        if (saveAsDefault && currentBusiness?.id) {
          await fetch('/api/product-variation-costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: currentBusiness.id,
              productId: item.product_id,
              productName: item.name,
              variationKey: variationKey || '',
              variationAttributes: variationAttributes,
              supplierId: selectedSupplier?.id || null,
              supplierName: state.supplier || null,
              unitCost: unitCost, // Save unit cost as default, not total
              isDefault: true,
            }),
          });
        }

        setItemCostStates(new Map(itemCostStates.set(key, { 
          ...state, 
          saving: false, 
          saved: true,
          isDefault: false,
          isVariationCost: false,
        })));

        // If saved as default, update local product costs map (unit cost)
        if (saveAsDefault) {
          const newProductCost: ProductCost = {
            product_id: item.product_id,
            product_name: item.name,
            unit_cost: unitCost,
            supplier_name: state.supplier,
          };
          setProductCosts(new Map(productCosts.set(item.name, newProductCost)));
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
        // Calculate total cost: unit cost * quantity
        const unitCost = parseFloat(state.cost) || 0;
        const quantity = parseFloat(state.quantity) || 1;
        totalCost += unitCost * quantity;
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
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100" dir="rtl">
      {/* Header - Fixed at top */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Package className="w-5 h-5" />
            <h2 className="text-base font-bold">
              הזמנות ליום {formatDate(date)}
            </h2>
            <div className="flex items-center gap-4 text-blue-100 text-sm">
              <span className="bg-white/20 px-2 py-0.5 rounded-full font-medium">
                {orders.length} הזמנות
              </span>
              <span className="font-semibold">
                סה"כ: {formatCurrency(totalRevenue)}
              </span>
              {!loadingCosts && (
                <span className={`flex items-center gap-1.5 font-semibold ${hasAnyMissingCosts ? 'text-yellow-300' : 'text-green-300'}`}>
                  <TrendingUp className="w-4 h-4" />
                  רווח: {formatCurrency(totalProfit)}
                  {hasAnyMissingCosts && (
                    <span title="חסרות עלויות">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="סגור (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-1.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* VAT Toggle for shipping */}
          {manualShippingPerItem ? (
            <label className="flex items-center gap-1.5 cursor-pointer bg-orange-50 px-2.5 py-1 rounded border border-orange-200 text-xs">
              <input
                type="checkbox"
                checked={addVatToShipping}
                onChange={(e) => setAddVatToShipping(e.target.checked)}
                className="w-3.5 h-3.5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
              />
              <span className="text-orange-800 font-medium">
                הוסף מע"מ ({vatRate}%) למשלוח
              </span>
            </label>
          ) : (
            <div />
          )}
          
          <div className="flex gap-1.5">
            <button
              onClick={expandAll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors font-medium"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              פתח הכל
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              סגור הכל
            </button>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-7xl mx-auto">
          {isLoading || loadingCosts ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">טוען הזמנות...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base">אין הזמנות ליום זה</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {orders.map((order, index) => {
                const { profit, hasMissingCosts } = calculateOrderProfit(order);
                const isExpanded = expandedOrders.has(order.id);
                const orderIndex = index + 1;
                
                // Alternate background colors for better visual separation
                const borderColor = hasMissingCosts ? 'border-orange-300' : 
                                   order.status === 'completed' ? 'border-green-300' : 'border-blue-200';
                
                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-lg overflow-hidden border ${borderColor} shadow-sm hover:shadow transition-all`}
                  >
                    {/* Order header - Clickable accordion trigger */}
                    <div 
                      onClick={() => toggleOrder(order.id)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        hasMissingCosts ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Order number badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          hasMissingCosts ? 'bg-orange-100 text-orange-700' : 
                          order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {orderIndex}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">#{order.id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              STATUS_LABELS[order.status]?.color || 'bg-gray-100 text-gray-700'
                            }`}>
                              {STATUS_LABELS[order.status]?.label || order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{order.billing.first_name} {order.billing.last_name}</span>
                            <span className="text-gray-300">|</span>
                            <span>{formatTime(order.date_created)}</span>
                            <span className="text-gray-300">|</span>
                            <span>{order.line_items.length} פריטים</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <span className="font-bold text-sm text-gray-900 block">
                            {formatCurrency(parseFloat(order.total))}
                          </span>
                          <span className={`text-xs font-medium ${hasMissingCosts ? 'text-orange-600' : 'text-green-600'}`}>
                            רווח: {formatCurrency(profit)}
                            {hasMissingCosts && ' ⚠️'}
                          </span>
                        </div>
                        <div className={`p-1.5 bg-gray-100 rounded transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-blue-100' : ''}`}>
                          <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
                        {/* Customer info */}
                        <div className="flex flex-wrap gap-3 text-xs mb-2 text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-500" />
                            {order.billing.first_name} {order.billing.last_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-green-500" />
                            {order.shipping.city || order.billing.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-purple-500" />
                            {order.payment_method_title}
                          </span>
                        </div>

                        {/* Line items with cost inputs */}
                        <div className="space-y-2">
                          {order.line_items.map((item) => {
                            const key = `${order.id}_${item.id}`;
                            const state = itemCostStates.get(key);
                            const totalItemCost = state?.cost 
                              ? (parseFloat(state.cost) || 0) * (parseFloat(state.quantity) || 1)
                              : 0;
                            const itemProfit = state?.cost 
                              ? parseFloat(item.total) - totalItemCost
                              : null;
                            const hasCost = state?.cost && parseFloat(state.cost) > 0;

                            return (
                              <div key={item.id} className={`text-xs bg-white p-2 rounded-lg border transition-all ${
                                state?.saved ? 'border-green-300 bg-green-50/30' : 
                                hasCost ? 'border-blue-200' : 'border-orange-200 bg-orange-50/20'
                              }`}>
                                {/* Product name and price row */}
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                    {state?.isReady && (
                                      <span title="יצא להכנה">
                                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                      </span>
                                    )}
                                    <span className="font-medium text-gray-900 truncate">{item.name}</span>
                                    <span className="text-gray-400 flex-shrink-0">x{item.quantity}</span>
                                    {!hasCost && (
                                      <span className="text-orange-500 flex-shrink-0">⚠️</span>
                                    )}
                                  </div>
                                  <div className="text-left flex-shrink-0 mr-2">
                                    <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(item.total))}</span>
                                    {itemProfit !== null && (
                                      <span className={`text-xs block ${itemProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        רווח: {formatCurrency(itemProfit)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              
                              {/* Variations */}
                              {getItemVariations(item).length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {getItemVariations(item).map((variation, idx) => (
                                    <span 
                                      key={idx} 
                                      className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded"
                                    >
                                      {variation}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Cost inputs - single compact row */}
                              <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-1.5 rounded border border-gray-100">
                                {/* Supplier */}
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                  {suppliers.length > 0 ? (
                                    <select
                                      value={state?.supplierId || state?.supplier || ''}
                                      onChange={(e) => {
                                        const selectedSupplier = suppliers.find(s => s.id === e.target.value || s.name === e.target.value);
                                        handleSupplierChange(order.id, item.id, selectedSupplier?.name || '', selectedSupplier?.id || '', item);
                                      }}
                                      className="px-1.5 py-1 text-xs border border-gray-200 rounded bg-white w-24"
                                    >
                                      <option value="">ספק</option>
                                      {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => setShowAddSupplier(true)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="הוסף ספק"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                
                                {/* Cost input */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">עלות:</span>
                                  <input
                                    type="number"
                                    value={state?.cost || ''}
                                    onChange={(e) => handleCostChange(order.id, item.id, e.target.value)}
                                    placeholder="0"
                                    className={`w-16 px-1.5 py-1 text-xs border rounded text-center font-medium ${
                                      state?.isDefault ? 'border-blue-300 bg-blue-50 text-blue-700' : 
                                      state?.saved ? 'border-green-300 bg-green-50 text-green-700' : 
                                      'border-gray-200'
                                    }`}
                                  />
                                  <span className="text-gray-400 text-xs">₪</span>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400">×</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={state?.quantity || '1'}
                                    onChange={(e) => handleQuantityChange(order.id, item.id, e.target.value)}
                                    className="w-10 px-1 py-1 text-xs border border-gray-200 rounded text-center font-medium"
                                  />
                                </div>

                                {/* Total if qty > 1 */}
                                {state?.cost && parseFloat(state.quantity || '1') > 1 && (
                                  <span className="text-xs text-gray-600 font-medium">
                                    = {formatCurrency((parseFloat(state.cost) || 0) * (parseFloat(state.quantity) || 1))}
                                  </span>
                                )}
                                
                                {/* Shipping cost - only when manual shipping enabled */}
                                {manualShippingPerItem && (
                                  <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                                    <input
                                      type="number"
                                      value={state?.shippingCost || ''}
                                      onChange={(e) => handleShippingCostChange(order.id, item.id, e.target.value)}
                                      placeholder="0"
                                      className="w-14 px-1.5 py-1 text-xs border border-orange-200 rounded text-center font-medium bg-orange-50 text-orange-700"
                                    />
                                    {addVatToShipping && state?.shippingCost && parseFloat(state.shippingCost) > 0 && (
                                      <span className="text-xs text-orange-600">
                                        (+מע״מ: {formatCurrency(parseFloat(state.shippingCost) * (1 + vatRate / 100))})
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Note input */}
                                <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                                  <StickyNote className="w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="text"
                                    value={state?.note || ''}
                                    onChange={(e) => handleNoteChange(order.id, item.id, e.target.value)}
                                    placeholder="הוסף הערה..."
                                    className="w-36 px-2 py-1 text-xs border border-gray-200 rounded font-medium placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
                                  />
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex items-center gap-1 mr-auto">
                                  <button
                                    onClick={() => saveCost(order, item, false)}
                                    disabled={!state?.cost || state?.saving}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      state?.saved 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {state?.saving ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : state?.saved ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        נשמר
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-3 h-3" />
                                        שמור
                                      </>
                                    )}
                                  </button>

                                  {state?.cost && (
                                    <button
                                      onClick={() => saveCost(order, item, true)}
                                      disabled={state?.saving}
                                      className="flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs font-medium"
                                      title="שמור כברירת מחדל"
                                    >
                                      <Star className="w-3 h-3" />
                                      ברירת מחדל
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Status indicator */}
                              {state?.isDefault && (
                                <div className={`text-xs mt-1 flex items-center gap-1 ${state.isVariationCost ? 'text-purple-600' : 'text-blue-600'}`}>
                                  <Star className="w-2.5 h-2.5" />
                                  {state.isVariationCost 
                                    ? `עלות וריאציה${state.supplier ? ` (${state.supplier})` : ''}`
                                    : 'ברירת מחדל - לחץ שמור לאישור'
                                  }
                                </div>
                              )}
                            </div>
                          );
                        })}
                          
                          {/* Shipping total */}
                          {parseFloat(order.shipping_total) > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 pt-2 mt-2 border-t border-gray-100">
                              <span>משלוח (מהאתר)</span>
                              <span className="font-medium">{formatCurrency(parseFloat(order.shipping_total))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="border-t border-gray-200 px-4 py-2 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {orders.length} הזמנות
              </span>
              {hasAnyMissingCosts && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                  <AlertCircle className="w-3 h-3" />
                  חסרות עלויות
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              סגור
            </button>
          </div>
        </div>
      </div>

      {/* Add Supplier Mini Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddSupplier(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-4 w-full max-w-xs" dir="rtl">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              הוסף ספק חדש
            </h3>
            <input
              type="text"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="שם הספק"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 outline-none mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSupplierName.trim()) {
                  handleAddSupplier();
                } else if (e.key === 'Escape') {
                  setShowAddSupplier(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplier(false);
                  setNewSupplierName('');
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleAddSupplier}
                disabled={!newSupplierName.trim() || addingSupplier}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {addingSupplier ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    מוסיף...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    הוסף
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
