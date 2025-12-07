'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Loader2, 
  CheckCircle2,
  Calendar,
  Hash,
  Building2,
  RefreshCw,
  Package,
  ChevronDown
} from 'lucide-react';
import OrdersTable from './OrdersTable';
import PDFReportGenerator from './PDFReportGenerator';
import { SupplierOrder, FilterOptions, Supplier } from './types';

// Interface for order status from WooCommerce
interface OrderStatus {
  slug: string;
  name: string;
  name_en?: string;
  total?: number;
}

// Helper function to get status color
const getStatusColor = (slug: string) => {
  const colors: Record<string, string> = {
    'completed': 'bg-green-100 text-green-800',
    'processing': 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    'pending': 'bg-orange-100 text-orange-800',
    'cancelled': 'bg-red-100 text-red-800',
    'refunded': 'bg-purple-100 text-purple-800',
    'failed': 'bg-gray-100 text-gray-800',
    'trash': 'bg-gray-100 text-gray-500',
  };
  return colors[slug] || 'bg-indigo-100 text-indigo-800'; // Default color for custom statuses
};

interface SupplierOrdersManagerProps {
  businessId: string;
}

export default function SupplierOrdersManager({ businessId }: SupplierOrdersManagerProps) {
  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  
  // Order statuses from WooCommerce
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  
  // Filters - Status is primary
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['processing']);
  const [selectedSupplier, setSelectedSupplier] = useState<string>(''); // For PDF filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [showNotReadyOnly, setShowNotReadyOnly] = useState(false);
  
  // Dropdowns
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Load order statuses from WooCommerce on mount
  useEffect(() => {
    loadOrderStatuses();
  }, [businessId]);

  // Load suppliers on mount (for PDF filtering)
  useEffect(() => {
    loadSuppliers();
  }, [businessId]);

  // Load orders when status selection changes
  useEffect(() => {
    if (selectedStatuses.length > 0) {
      loadOrders();
    } else {
      setOrders([]);
      setFilteredOrders([]);
    }
  }, [selectedStatuses, businessId]);

  // Filter orders locally when search/supplier/ready filters change
  useEffect(() => {
    filterOrdersLocally();
  }, [orders, searchTerm, selectedSupplier, showReadyOnly, showNotReadyOnly]);

  const loadOrderStatuses = async () => {
    setLoadingStatuses(true);
    try {
      const res = await fetch(`/api/woo-statuses?businessId=${businessId}`);
      const json = await res.json();
      setOrderStatuses(json.statuses || []);
    } catch (error) {
      console.error('Error loading order statuses:', error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?businessId=${businessId}`);
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadOrders = async () => {
    if (selectedStatuses.length === 0) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        businessId,
        statuses: selectedStatuses.join(','),
      });
      
      const res = await fetch(`/api/supplier-orders?${params.toString()}`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersLocally = () => {
    let filtered = [...orders];
    
    // Supplier filter
    if (selectedSupplier) {
      filtered = filtered.filter(order => order.supplier_name === selectedSupplier);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_id.toString().includes(term) ||
        order.product_name.toLowerCase().includes(term) ||
        (order.variation_key && order.variation_key.toLowerCase().includes(term)) ||
        (order.supplier_name && order.supplier_name.toLowerCase().includes(term))
      );
    }
    
    // Ready status filter
    if (showReadyOnly) {
      filtered = filtered.filter(order => order.is_ready);
    } else if (showNotReadyOnly) {
      filtered = filtered.filter(order => !order.is_ready);
    }
    
    setFilteredOrders(filtered);
  };

  const handleUpdateOrder = async (orderId: number, itemId: number, updates: Partial<SupplierOrder>) => {
    try {
      const res = await fetch('/api/supplier-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          orderId,
          itemId,
          ...updates,
        }),
      });
      
      if (res.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.order_id === orderId && order.item_id === itemId
            ? { ...order, ...updates }
            : order
        ));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    }
  };

  const handleToggleReady = async (orderId: number, itemId: number, currentStatus: boolean) => {
    // Find the order to get additional data needed for insert
    const order = orders.find(o => o.order_id === orderId && o.item_id === itemId);
    if (!order) return false;
    
    return handleUpdateOrder(orderId, itemId, { 
      is_ready: !currentStatus,
      product_name: order.product_name,
      product_id: order.product_id,
      supplier_name: order.supplier_name,
      unit_cost: order.unit_cost,
      quantity: order.quantity,
      order_date: order.order_date,
    });
  };

  const handleMarkAllReady = async () => {
    const unreadyOrders = filteredOrders.filter(o => !o.is_ready);
    for (const order of unreadyOrders) {
      await handleUpdateOrder(order.order_id, order.item_id, { 
        is_ready: true,
        product_name: order.product_name,
        product_id: order.product_id,
        supplier_name: order.supplier_name,
        unit_cost: order.unit_cost,
        quantity: order.quantity,
        order_date: order.order_date,
      });
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Get unique suppliers from loaded orders
  const uniqueSuppliers = Array.from(new Set(orders.map(o => o.supplier_name).filter(Boolean)));

  // Calculate summary stats
  const stats = {
    totalOrders: new Set(filteredOrders.map(o => o.order_id)).size,
    totalItems: filteredOrders.length,
    readyItems: filteredOrders.filter(o => o.is_ready).length,
    totalCost: filteredOrders.reduce((sum, o) => {
      const cost = o.adjusted_cost ?? o.unit_cost ?? 0;
      const quantity = o.quantity || 1;
      return sum + (cost * quantity);
    }, 0),
  };

  // For PDF - get supplier object
  const selectedSupplierObj = suppliers.find(s => s.name === selectedSupplier) || 
    (selectedSupplier ? { id: '', name: selectedSupplier } as Supplier : null);

  return (
    <div className="space-y-6">
      {/* Status Filter - Primary */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-orange-500" />
          סינון לפי סטטוס הזמנה
        </h2>
        
        {loadingStatuses ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-500">טוען סטטוסים מהחנות...</span>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full md:w-96 flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {selectedStatuses.length === 0 ? (
                  <span className="text-gray-500">בחר סטטוסים...</span>
                ) : (
                  selectedStatuses.map(status => {
                    const statusInfo = orderStatuses.find(s => s.slug === status);
                    return (
                      <span key={status} className={`px-2 py-1 rounded-lg text-sm ${getStatusColor(status)}`}>
                        {statusInfo?.name || status}
                      </span>
                    );
                  })
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute z-20 mt-2 w-full md:w-96 bg-white border rounded-xl shadow-lg p-2 max-h-80 overflow-y-auto">
                {orderStatuses.map(status => (
                  <label
                    key={status.slug}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status.slug)}
                      onChange={() => toggleStatus(status.slug)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`px-2 py-1 rounded-lg text-sm ${getStatusColor(status.slug)}`}>
                      {status.name}
                    </span>
                    {status.total !== undefined && (
                      <span className="text-xs text-gray-400 mr-auto">({status.total})</span>
                    )}
                  </label>
                ))}
                <div className="border-t mt-2 pt-2 flex gap-2 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setSelectedStatuses(orderStatuses.map(s => s.slug))}
                    className="flex-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={() => setSelectedStatuses([])}
                    className="flex-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    נקה הכל
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedStatuses.length > 0 && (
        <>
          {/* Secondary Filters */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="חיפוש לפי מספר הזמנה, מוצר או ספק..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Supplier Filter */}
              {uniqueSuppliers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100"
                  >
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span>{selectedSupplier || 'כל הספקים'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showSupplierDropdown && (
                    <div className="absolute z-20 mt-2 w-48 bg-white border rounded-xl shadow-lg p-2">
                      <button
                        onClick={() => { setSelectedSupplier(''); setShowSupplierDropdown(false); }}
                        className={`w-full text-right px-3 py-2 rounded-lg hover:bg-gray-50 ${!selectedSupplier ? 'bg-blue-50 text-blue-700' : ''}`}
                      >
                        כל הספקים
                      </button>
                      {uniqueSuppliers.map(supplier => (
                        <button
                          key={supplier}
                          onClick={() => { setSelectedSupplier(supplier); setShowSupplierDropdown(false); }}
                          className={`w-full text-right px-3 py-2 rounded-lg hover:bg-gray-50 ${selectedSupplier === supplier ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          {supplier}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Ready Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowReadyOnly(false); setShowNotReadyOnly(false); }}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${!showReadyOnly && !showNotReadyOnly ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  הכל
                </button>
                <button
                  onClick={() => { setShowReadyOnly(true); setShowNotReadyOnly(false); }}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${showReadyOnly ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  ✓ מוכנים
                </button>
                <button
                  onClick={() => { setShowReadyOnly(false); setShowNotReadyOnly(true); }}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${showNotReadyOnly ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  ממתינים
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-sm text-gray-500">הזמנות</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalOrders}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-sm text-gray-500">פריטים</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalItems}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-sm text-gray-500">מוכנים</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.readyItems} / {stats.totalItems}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-sm text-gray-500">סה״כ עלות</div>
              <div className="text-2xl font-bold text-blue-600">
                ₪{stats.totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <PDFReportGenerator
              orders={filteredOrders}
              selectedStatuses={new Set(selectedStatuses)}
            />
            <button
              onClick={handleMarkAllReady}
              disabled={filteredOrders.filter(o => !o.is_ready).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              סמן הכל כמוכן
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              רענן
            </button>
          </div>

          {/* Orders Table */}
          <OrdersTable
            orders={filteredOrders}
            loading={loading}
            onUpdateOrder={handleUpdateOrder}
            onToggleReady={handleToggleReady}
          />

          {/* PDF Export Button is in the header, no modal needed */}
        </>
      )}

      {/* Empty State */}
      {selectedStatuses.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">בחר סטטוס הזמנה</h3>
          <p className="text-gray-500">בחר לפחות סטטוס אחד כדי לראות את ההזמנות</p>
        </div>
      )}
    </div>
  );
}
