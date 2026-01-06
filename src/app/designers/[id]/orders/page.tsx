'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowRight,
  ShoppingBag, 
  Plus, 
  Search, 
  Trash2,
  Calendar,
  Package,
  DollarSign,
  X,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Designer {
  id: string;
  name: string;
  email: string;
  commission_rate: number;
}

interface DesignerOrder {
  id: string;
  woo_order_id: number;
  order_number: string;
  order_date: string;
  customer_name: string;
  order_total: number;
  commission_amount: number;
  status: string;
  month_year: string;
}

interface WooOrder {
  id: number;
  number: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
  };
  total: string;
  status: string;
}

export default function DesignerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const designerId = params.id as string;
  
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [orders, setOrders] = useState<DesignerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (designerId) {
      fetchDesigner();
      fetchOrders();
    }
  }, [designerId]);

  const fetchDesigner = async () => {
    const { data, error } = await supabase
      .from('designers')
      .select('id, name, email, commission_rate')
      .eq('id', designerId)
      .single();

    if (data) setDesigner(data);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('designer_orders')
      .select('*')
      .eq('designer_id', designerId)
      .order('order_date', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('למחוק הזמנה זו?')) return;
    
    await supabase
      .from('designer_orders')
      .delete()
      .eq('id', orderId);
    
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: 'ממתין',
      approved: 'מאושר',
      paid: 'שולם',
      cancelled: 'בוטל',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const totalSales = orders.reduce((sum, o) => sum + Number(o.order_total), 0);
  const totalCommission = orders.reduce((sum, o) => sum + Number(o.commission_amount), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
          <Link 
            href="/designers"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לרשימת מעצבות
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingBag className="w-7 h-7 text-green-600" />
                הזמנות - {designer?.name || '...'}
              </h1>
              <p className="text-gray-500 mt-1">{designer?.email} • עמלה {designer?.commission_rate}%</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              שיוך הזמנה
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">הזמנות</p>
                <p className="text-xl font-bold text-gray-800">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">סה"כ מכירות</p>
                <p className="text-xl font-bold text-gray-800">₪{totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">סה"כ עמלות</p>
                <p className="text-xl font-bold text-purple-600">₪{totalCommission.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">טוען הזמנות...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין הזמנות משויכות</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-green-600 hover:underline"
              >
                שייך הזמנה ראשונה
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">מס' הזמנה</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">תאריך</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">לקוח</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">סכום</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">עמלה</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">חודש</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">סטטוס</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">#{order.order_number}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(order.order_date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.customer_name || '-'}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        ₪{Number(order.order_total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        ₪{Number(order.commission_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.month_year}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Order Modal */}
        {showAddModal && designer && (
          <AddOrderModal
            designer={designer}
            existingOrderIds={orders.map(o => o.woo_order_id)}
            onClose={() => setShowAddModal(false)}
            onSave={() => {
              fetchOrders();
              setShowAddModal(false);
            }}
          />
        )}
    </div>
  );
}

// Add Order Modal
function AddOrderModal({
  designer,
  existingOrderIds,
  onClose,
  onSave,
}: {
  designer: Designer;
  existingOrderIds: number[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [wooOrders, setWooOrders] = useState<WooOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const searchOrders = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    try {
      // Fetch from WooCommerce API
      const res = await fetch(`/api/woocommerce/orders?search=${searchTerm}`);
      if (res.ok) {
        const data = await res.json();
        setWooOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignOrder = async (order: WooOrder) => {
    setSaving(order.id);
    
    const orderDate = new Date(order.date_created);
    const monthYear = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    const total = parseFloat(order.total);
    const commission = total * (designer.commission_rate / 100);

    try {
      // Add order
      const { error: orderError } = await supabase
        .from('designer_orders')
        .insert({
          designer_id: designer.id,
          woo_order_id: order.id,
          order_number: order.number,
          order_date: order.date_created.split('T')[0],
          customer_name: `${order.billing.first_name} ${order.billing.last_name}`,
          order_total: total,
          commission_amount: commission,
          status: 'pending',
          month_year: monthYear,
        });

      if (orderError) throw orderError;

      // Update or create invoice
      const { data: existingInvoice } = await supabase
        .from('designer_invoices')
        .select('*')
        .eq('designer_id', designer.id)
        .eq('month_year', monthYear)
        .single();

      if (existingInvoice) {
        await supabase
          .from('designer_invoices')
          .update({
            total_orders: existingInvoice.total_orders + 1,
            total_sales: Number(existingInvoice.total_sales) + total,
            commission_total: Number(existingInvoice.commission_total) + commission,
          })
          .eq('id', existingInvoice.id);
      } else {
        await supabase
          .from('designer_invoices')
          .insert({
            designer_id: designer.id,
            month_year: monthYear,
            total_orders: 1,
            total_sales: total,
            commission_total: commission,
            status: 'open',
          });
      }

      onSave();
    } catch (error) {
      console.error('Error assigning order:', error);
      alert('שגיאה בשיוך ההזמנה');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">שיוך הזמנה ל{designer.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="חפש לפי מספר הזמנה או שם לקוח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchOrders()}
                className="w-full pr-10 pl-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={searchOrders}
              disabled={loading || !searchTerm}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'מחפש...' : 'חיפוש'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {wooOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>חפש הזמנות מ-WooCommerce</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wooOrders.map((order) => {
                const isAssigned = existingOrderIds.includes(order.id);
                return (
                  <div
                    key={order.id}
                    className={`p-4 border rounded-xl flex items-center justify-between ${
                      isAssigned ? 'bg-gray-50 opacity-50' : 'hover:border-green-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-800">#{order.number}</p>
                      <p className="text-sm text-gray-500">
                        {order.billing.first_name} {order.billing.last_name} • 
                        {new Date(order.date_created).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-gray-800">₪{parseFloat(order.total).toLocaleString()}</p>
                      {isAssigned ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <Check className="w-4 h-4" />
                          משויך
                        </span>
                      ) : (
                        <button
                          onClick={() => assignOrder(order)}
                          disabled={saving === order.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {saving === order.id ? 'משייך...' : 'שייך'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
