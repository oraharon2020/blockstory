'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  ShoppingBag,
  FileText,
  X,
  Check,
  Copy
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Designer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company_name: string | null;
  commission_rate: number;
  referral_code: string | null;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  _count?: {
    orders: number;
    totalSales: number;
    totalCommission: number;
  };
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    setLoading(true);
    try {
      const { data: designersData, error } = await supabase
        .from('designers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each designer
      const designersWithStats = await Promise.all(
        (designersData || []).map(async (designer) => {
          const { data: orders } = await supabase
            .from('designer_orders')
            .select('order_total, commission_amount')
            .eq('designer_id', designer.id);

          return {
            ...designer,
            _count: {
              orders: orders?.length || 0,
              totalSales: orders?.reduce((sum, o) => sum + Number(o.order_total), 0) || 0,
              totalCommission: orders?.reduce((sum, o) => sum + Number(o.commission_amount), 0) || 0,
            },
          };
        })
      );

      setDesigners(designersWithStats);
    } catch (error) {
      console.error('Error fetching designers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDesigners = designers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      active: 'פעיל',
      inactive: 'לא פעיל',
      pending: 'ממתין',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="w-7 h-7 text-blue-600" />
              ניהול מעצבות
            </h1>
            <p className="text-gray-500 mt-1">ניהול מעצבות פנים ועמלות</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            הוספת מעצבת
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל או קוד הפניה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">סה"כ מעצבות</p>
            <p className="text-2xl font-bold text-gray-800">{designers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">פעילות</p>
            <p className="text-2xl font-bold text-green-600">
              {designers.filter(d => d.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">סה"כ הזמנות</p>
            <p className="text-2xl font-bold text-blue-600">
              {designers.reduce((sum, d) => sum + (d._count?.orders || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">סה"כ עמלות</p>
            <p className="text-2xl font-bold text-purple-600">
              ₪{designers.reduce((sum, d) => sum + (d._count?.totalCommission || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Designers List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">טוען מעצבות...</p>
            </div>
          ) : filteredDesigners.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין מעצבות להצגה</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:underline"
              >
                הוסף מעצבת ראשונה
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">מעצבת</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">קוד הפניה</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">עמלה</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">הזמנות</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">סה"כ מכירות</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">סטטוס</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDesigners.map((designer) => (
                    <tr key={designer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">{designer.name}</p>
                          <p className="text-sm text-gray-500">{designer.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {designer.referral_code ? (
                          <button
                            onClick={() => copyReferralCode(designer.referral_code!)}
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <code className="text-sm font-mono">{designer.referral_code}</code>
                            {copiedCode === designer.referral_code ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{designer.commission_rate}%</td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {designer._count?.orders || 0}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        ₪{(designer._count?.totalSales || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(designer.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingDesigner(designer)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="עריכה"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <a
                            href={`/designers/${designer.id}/orders`}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="הזמנות"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </a>
                          <a
                            href={`/designers/${designer.id}/invoices`}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="חשבוניות"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || editingDesigner) && (
          <DesignerModal
            designer={editingDesigner}
            onClose={() => {
              setShowAddModal(false);
              setEditingDesigner(null);
            }}
            onSave={() => {
              fetchDesigners();
              setShowAddModal(false);
              setEditingDesigner(null);
            }}
          />
        )}
    </div>
  );
}

// Modal Component
function DesignerModal({ 
  designer, 
  onClose, 
  onSave 
}: { 
  designer: Designer | null; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: designer?.name || '',
    email: designer?.email || '',
    phone: designer?.phone || '',
    company_name: designer?.company_name || '',
    commission_rate: designer?.commission_rate || 10,
    referral_code: designer?.referral_code || '',
    status: designer?.status || 'active',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generateReferralCode = () => {
    const code = formData.name
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6) + Math.floor(Math.random() * 1000);
    setFormData({ ...formData, referral_code: code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (designer) {
        // Update existing
        const { error: updateError } = await supabase
          .from('designers')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            company_name: formData.company_name || null,
            commission_rate: formData.commission_rate,
            referral_code: formData.referral_code || null,
            status: formData.status,
          })
          .eq('id', designer.id);

        if (updateError) throw updateError;

        // Update password if provided
        if (formData.password) {
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(formData.password).digest('hex');
          
          await supabase
            .from('designer_auth')
            .update({ password_hash: hash })
            .eq('designer_id', designer.id);
        }
      } else {
        // Create new
        const { data: newDesigner, error: insertError } = await supabase
          .from('designers')
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            company_name: formData.company_name || null,
            commission_rate: formData.commission_rate,
            referral_code: formData.referral_code || null,
            status: formData.status,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Create auth record
        if (formData.password && newDesigner) {
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(formData.password).digest('hex');
          
          await supabase
            .from('designer_auth')
            .insert({
              designer_id: newDesigner.id,
              password_hash: hash,
            });
        }
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {designer ? 'עריכת מעצבת' : 'הוספת מעצבת חדשה'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם חברה</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אחוז עמלה</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
                <option value="pending">ממתין</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קוד הפניה (לקופון)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.referral_code}
                onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="MAYA2025"
              />
              <button
                type="button"
                onClick={generateReferralCode}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                ייצר
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">צור קופון בוו-קומרס עם אותו שם</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {designer ? 'סיסמה חדשה (השאר ריק לשמירת הקיימת)' : 'סיסמה *'}
            </label>
            <input
              type="password"
              required={!designer}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'שומר...' : designer ? 'עדכון' : 'הוספה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
