'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowRight,
  FileText, 
  CheckCircle,
  Clock,
  DollarSign,
  Upload,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Designer {
  id: string;
  name: string;
  email: string;
}

interface Invoice {
  id: string;
  month_year: string;
  total_orders: number;
  total_sales: number;
  commission_total: number;
  invoice_number: string | null;
  invoice_file_url: string | null;
  status: 'open' | 'submitted' | 'approved' | 'paid';
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
}

export default function DesignerInvoicesPage() {
  const params = useParams();
  const designerId = params.id as string;
  
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (designerId) {
      fetchDesigner();
      fetchInvoices();
    }
  }, [designerId]);

  const fetchDesigner = async () => {
    const { data } = await supabase
      .from('designers')
      .select('id, name, email')
      .eq('id', designerId)
      .single();

    if (data) setDesigner(data);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('designer_invoices')
      .select('*')
      .eq('designer_id', designerId)
      .order('month_year', { ascending: false });

    if (data) setInvoices(data);
    setLoading(false);
  };

  const updateStatus = async (invoiceId: string, newStatus: string) => {
    setUpdating(invoiceId);
    
    const updates: any = { status: newStatus };
    if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString();

    await supabase
      .from('designer_invoices')
      .update(updates)
      .eq('id', invoiceId);

    fetchInvoices();
    setUpdating(null);
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      open: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'פתוח', icon: <Clock className="w-4 h-4" /> },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'הוגש', icon: <Upload className="w-4 h-4" /> },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'מאושר', icon: <CheckCircle className="w-4 h-4" /> },
      paid: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'שולם', icon: <DollarSign className="w-4 h-4" /> },
    };
    const c = config[status] || config.open;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  const totalPending = invoices
    .filter(i => i.status === 'approved')
    .reduce((sum, i) => sum + Number(i.commission_total), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.commission_total), 0);

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
          
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FileText className="w-7 h-7 text-purple-600" />
              חשבוניות - {designer?.name || '...'}
            </h1>
            <p className="text-gray-500 mt-1">{designer?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">חשבוניות</p>
                <p className="text-xl font-bold text-gray-800">{invoices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ממתין לתשלום</p>
                <p className="text-xl font-bold text-orange-600">₪{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">שולם</p>
                <p className="text-xl font-bold text-green-600">₪{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">טוען חשבוניות...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין חשבוניות</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {formatMonthYear(invoice.month_year)}
                        </h3>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">הזמנות</p>
                          <p className="font-medium text-gray-800">{invoice.total_orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">מכירות</p>
                          <p className="font-medium text-gray-800">₪{Number(invoice.total_sales).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">עמלה</p>
                          <p className="font-bold text-purple-600">₪{Number(invoice.commission_total).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {invoice.invoice_file_url && (
                        <a
                          href={invoice.invoice_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          צפייה
                        </a>
                      )}
                      
                      {invoice.status === 'submitted' && (
                        <button
                          onClick={() => updateStatus(invoice.id, 'approved')}
                          disabled={updating === invoice.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {updating === invoice.id ? 'מאשר...' : 'אישור'}
                        </button>
                      )}
                      
                      {invoice.status === 'approved' && (
                        <button
                          onClick={() => updateStatus(invoice.id, 'paid')}
                          disabled={updating === invoice.id}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          <DollarSign className="w-4 h-4" />
                          {updating === invoice.id ? 'מעדכן...' : 'סמן כשולם'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {(invoice.submitted_at || invoice.approved_at || invoice.paid_at) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                      {invoice.submitted_at && (
                        <span>הוגש: {new Date(invoice.submitted_at).toLocaleDateString('he-IL')}</span>
                      )}
                      {invoice.approved_at && (
                        <span>אושר: {new Date(invoice.approved_at).toLocaleDateString('he-IL')}</span>
                      )}
                      {invoice.paid_at && (
                        <span>שולם: {new Date(invoice.paid_at).toLocaleDateString('he-IL')}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
