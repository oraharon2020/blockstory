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
  const [statusSearchTerm, setStatusSearchTerm] = useState(''); // חיפוש סטטוסים
  const [orderIdsFilter, setOrderIdsFilter] = useState(''); // פילטר מספרי הזמנות
  
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

  // Load orders when status selection changes OR when loading by order IDs
  useEffect(() => {
    if (selectedStatuses.length > 0 && !orderIdsFilter.trim()) {
      loadOrders();
    } else if (!orderIdsFilter.trim()) {
      setOrders([]);
      setFilteredOrders([]);
    }
  }, [selectedStatuses, businessId]);

  // Load orders by IDs when orderIdsFilter changes (debounced)
  useEffect(() => {
    if (!orderIdsFilter.trim()) return;
    
    const timeoutId = setTimeout(() => {
      loadOrdersByIds();
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [orderIdsFilter, businessId]);

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

  const loadOrdersByIds = async () => {
    const orderIds = orderIdsFilter
      .split(/[\s,\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0 && !isNaN(parseInt(id, 10)));
    
    if (orderIds.length === 0) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        businessId,
        orderIds: orderIds.join(','),
      });
      
      const res = await fetch(`/api/supplier-orders?${params.toString()}`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (error) {
      console.error('Error loading orders by IDs:', error);
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
    <div className="space-y-3">
      {/* Status Filter - Primary */}
      <div className="bg-white rounded-lg shadow-sm border p-3">
        <h2 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-orange-500" />
          סינון לפי סטטוס
        </h2>
        
        {loadingStatuses ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-gray-500 text-xs">טוען סטטוסים...</span>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full md:w-80 flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedStatuses.length === 0 ? (
                  <span className="text-gray-500">בחר סטטוסים...</span>
                ) : (
                  selectedStatuses.map(status => {
                    const statusInfo = orderStatuses.find(s => s.slug === status);
                    return (
                      <span key={status} className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(status)}`}>
                        {statusInfo?.name || status}
                      </span>
                    );
                  })
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute z-20 mt-1 w-full md:w-80 bg-white border rounded shadow-lg max-h-72 overflow-hidden flex flex-col">
                {/* Search box for statuses */}
                <div className="p-1.5 border-b sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="חיפוש סטטוס..."
                      value={statusSearchTerm}
                      onChange={(e) => setStatusSearchTerm(e.target.value)}
                      className="w-full pr-7 pl-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {/* Status list */}
                <div className="overflow-y-auto flex-1 p-1.5">
                  {orderStatuses
                    .filter(status => {
                      if (!statusSearchTerm) return true;
                      const term = statusSearchTerm.toLowerCase();
                      return status.name.toLowerCase().includes(term) || 
                             status.slug.toLowerCase().includes(term) ||
                             (status.name_en && status.name_en.toLowerCase().includes(term));
                    })
                    .map(status => (
                    <label
                      key={status.slug}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.slug)}
                        onChange={() => toggleStatus(status.slug)}
                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(status.slug)}`}>
                        {status.name}
                      </span>
                      {status.total !== undefined && (
                        <span className="text-xs text-gray-400 mr-auto">({status.total})</span>
                      )}
                    </label>
                  ))}
                  {orderStatuses.filter(status => {
                    if (!statusSearchTerm) return true;
                    const term = statusSearchTerm.toLowerCase();
                    return status.name.toLowerCase().includes(term) || 
                           status.slug.toLowerCase().includes(term) ||
                           (status.name_en && status.name_en.toLowerCase().includes(term));
                  }).length === 0 && (
                    <div className="text-center py-3 text-gray-500 text-xs">
                      לא נמצאו סטטוסים
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="border-t p-1.5 flex gap-1.5 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setSelectedStatuses(orderStatuses.map(s => s.slug))}
                    className="flex-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={() => setSelectedStatuses([])}
                    className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    נקה
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order IDs Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-2">
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <div className="flex items-center gap-1.5 min-w-fit">
            <Hash className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-700">מספרי הזמנות:</span>
          </div>
          <div className="flex-1 w-full">
            <textarea
              placeholder="53866, 53865, 53864..."
              value={orderIdsFilter}
              onChange={(e) => {
                setOrderIdsFilter(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedStatuses([]);
                }
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={1}
            />
          </div>
          {orderIdsFilter && (
            <button
              onClick={() => setOrderIdsFilter('')}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
            >
              נקה
            </button>
          )}
        </div>
        {orderIdsFilter && (
          <div className="mt-1 text-xs text-purple-600 font-medium">
            {(() => {
              const ids = orderIdsFilter
                .split(/[\s,\n]+/)
                .map(id => id.trim())
                .filter(id => id.length > 0 && !isNaN(parseInt(id, 10)));
              return `מחפש ${ids.length} הזמנות`;
            })()}
          </div>
        )}
      </div>

      {(selectedStatuses.length > 0 || orderIdsFilter.trim()) && (
        <>
          {/* Secondary Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-2">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="חיפוש מוצר, הזמנה, ספק..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-7 pl-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Supplier Filter */}
              {uniqueSuppliers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                  >
                    <Building2 className="w-3 h-3 text-gray-500" />
                    <span>{selectedSupplier || 'כל הספקים'}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  
                  {showSupplierDropdown && (
                    <div className="absolute z-20 mt-1 w-40 bg-white border rounded shadow-lg p-1">
                      <button
                        onClick={() => { setSelectedSupplier(''); setShowSupplierDropdown(false); }}
                        className={`w-full text-right px-2 py-1.5 text-xs rounded hover:bg-gray-50 ${!selectedSupplier ? 'bg-blue-50 text-blue-700' : ''}`}
                      >
                        כל הספקים
                      </button>
                      {uniqueSuppliers.map(supplier => (
                        <button
                          key={supplier}
                          onClick={() => { setSelectedSupplier(supplier); setShowSupplierDropdown(false); }}
                          className={`w-full text-right px-2 py-1.5 text-xs rounded hover:bg-gray-50 ${selectedSupplier === supplier ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          {supplier}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Ready Filter */}
              <div className="flex gap-1">
                <button
                  onClick={() => { setShowReadyOnly(false); setShowNotReadyOnly(false); }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${!showReadyOnly && !showNotReadyOnly ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  הכל
                </button>
                <button
                  onClick={() => { setShowReadyOnly(true); setShowNotReadyOnly(false); }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${showReadyOnly ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  ✓ מוכנים
                </button>
                <button
                  onClick={() => { setShowReadyOnly(false); setShowNotReadyOnly(true); }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${showNotReadyOnly ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  ממתינים
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-2">
            <div className="bg-white rounded px-3 py-1.5 border shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-500">הזמנות:</span>
              <span className="text-sm font-bold text-gray-800">{stats.totalOrders}</span>
            </div>
            <div className="bg-white rounded px-3 py-1.5 border shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-500">פריטים:</span>
              <span className="text-sm font-bold text-gray-800">{stats.totalItems}</span>
            </div>
            <div className="bg-white rounded px-3 py-1.5 border shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-500">מוכנים:</span>
              <span className="text-sm font-bold text-green-600">{stats.readyItems}/{stats.totalItems}</span>
            </div>
            <div className="bg-white rounded px-3 py-1.5 border shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-500">סה״כ:</span>
              <span className="text-sm font-bold text-blue-600">₪{stats.totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <PDFReportGenerator
              orders={filteredOrders}
              selectedStatuses={new Set(selectedStatuses)}
              availableSuppliers={suppliers.map(s => s.name)}
            />
            <button
              onClick={handleMarkAllReady}
              disabled={filteredOrders.filter(o => !o.is_ready).length === 0}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              סמן הכל מוכן
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
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
      {selectedStatuses.length === 0 && !orderIdsFilter.trim() && (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-600 mb-1">בחר סטטוס הזמנה</h3>
          <p className="text-xs text-gray-500">בחר סטטוס או הזן מספרי הזמנות</p>
        </div>
      )}
    </div>
  );
}
