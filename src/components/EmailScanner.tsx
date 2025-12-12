/**
 * Email Scanner Component
 * קומפוננטה לסריקת מיילים וייבוא חשבוניות
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Loader2,
  Check,
  X,
  AlertTriangle,
  FileText,
  RefreshCw,
  Link2,
  Link2Off,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Calendar,
  Settings,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { useAuth } from '@/contexts/AuthContext';

interface ScannedInvoice {
  emailId: string;
  attachmentId: string;
  filename: string;
  fileUrl?: string;
  extractedData: {
    supplier_name: string;
    amount: number;
    vat_amount: number;
    invoice_number: string;
    invoice_date: string;
    description: string;
    has_vat: boolean;
    confidence: 'high' | 'medium' | 'low';
  };
  isDuplicate: boolean;
  duplicateOf?: number;
  status: 'pending' | 'approved' | 'rejected' | 'added';
  matchReason?: string;
  fromEmail?: string;
}

interface GmailAccount {
  email: string;
  isConnected: boolean;
}

interface EmailScannerProps {
  month: number;
  year: number;
  onInvoicesAdded?: () => void;
  onClose?: () => void;
}

export default function EmailScanner({ month, year, onInvoicesAdded, onClose }: EmailScannerProps) {
  const { currentBusiness } = useAuth();
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([]);
  const [adding, setAdding] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range mode
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(year, month - 1, 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(year, month, 0);
    return d.toISOString().split('T')[0];
  });
  
  // Show settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Load connected accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [currentBusiness?.id]);

  // Check URL params for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      loadAccounts();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('gmail_error')) {
      setError(params.get('gmail_error') || 'שגיאה בחיבור');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadAccounts = async () => {
    if (!currentBusiness?.id) return;
    
    setLoadingAccounts(true);
    
    try {
      const res = await fetch(`/api/gmail/status?businessId=${currentBusiness.id}`);
      const data = await res.json();
      
      if (data.isConnected) {
        setAccounts([{ email: data.email, isConnected: true }]);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleConnect = () => {
    if (!currentBusiness?.id) return;
    
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/gmail/auth?businessId=${currentBusiness.id}&returnUrl=${returnUrl}`;
  };

  const handleDisconnect = async (email?: string) => {
    if (!currentBusiness?.id) return;
    
    try {
      await fetch(`/api/gmail/status?businessId=${currentBusiness.id}`, {
        method: 'DELETE',
      });
      setAccounts([]);
      setInvoices([]);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleScan = async () => {
    if (!currentBusiness?.id || accounts.length === 0) return;
    
    setScanning(true);
    setError(null);
    setInvoices([]);
    
    // Progress messages that update during scan
    const progressMessages = [
      'מתחבר ל-Gmail...',
      'מחפש מיילים עם חשבוניות...',
      'מוריד קבצים מצורפים...',
      'קורא חשבוניות עם AI...',
      'מעבד חשבונית 1...',
      'מעבד חשבונית 2...',
      'מעבד חשבונית 3...',
      'בודק כפילויות...',
      'כמעט סיימנו...',
    ];
    
    let messageIndex = 0;
    setScanProgress(progressMessages[0]);
    
    // Update progress message every 3 seconds
    const progressInterval = setInterval(() => {
      messageIndex++;
      if (messageIndex < progressMessages.length) {
        setScanProgress(progressMessages[messageIndex]);
      }
    }, 3000);
    
    try {
      const res = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          year: useDateRange ? undefined : year,
          month: useDateRange ? undefined : month,
          startDate: useDateRange ? startDate : undefined,
          endDate: useDateRange ? endDate : undefined,
        }),
      });
      
      clearInterval(progressInterval);
      
      const data = await res.json();
      
      if (data.needsAuth) {
        setAccounts([]);
        setError('נדרשת התחברות מחדש ל-Gmail');
        return;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Set all new invoices as approved by default
      const processedInvoices = data.invoices.map((inv: ScannedInvoice) => ({
        ...inv,
        status: inv.isDuplicate ? 'rejected' : 'approved',
      }));
      
      setInvoices(processedInvoices);
      setScanProgress(`✓ נמצאו ${data.summary.totalAttachments} חשבוניות (${data.summary.newInvoices} חדשות, ${data.summary.duplicates} כפולות)`);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message);
      setScanProgress('');
    } finally {
      setScanning(false);
    }
  };

  const toggleInvoiceStatus = (index: number) => {
    setInvoices(prev => prev.map((inv, i) => {
      if (i !== index) return inv;
      return {
        ...inv,
        status: inv.status === 'approved' ? 'rejected' : 'approved',
      };
    }));
  };

  const approveAll = () => {
    setInvoices(prev => prev.map(inv => ({
      ...inv,
      status: inv.isDuplicate ? inv.status : 'approved',
    })));
  };

  const rejectAll = () => {
    setInvoices(prev => prev.map(inv => ({
      ...inv,
      status: 'rejected',
    })));
  };

  const handleAddInvoices = async () => {
    if (!currentBusiness?.id) return;
    
    const toAdd = invoices.filter(inv => inv.status === 'approved');
    if (toAdd.length === 0) return;
    
    setAdding(true);
    
    try {
      const res = await fetch('/api/gmail/add-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          invoices: toAdd,
        }),
      });
      
      const data = await res.json();
      console.log('📊 Add invoices response:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update status
      setInvoices(prev => prev.map(inv => ({
        ...inv,
        status: inv.status === 'approved' ? 'added' : inv.status,
      })));
      
      // Callback
      onInvoicesAdded?.();
      
      // Show results message
      const { added, skipped, errors } = data.results;
      let message = `נוספו ${added} חשבוניות בהצלחה`;
      if (skipped > 0) {
        message += `, ${skipped} דולגו (כפולות)`;
      }
      if (errors.length > 0) {
        message += `\n${errors.join('\n')}`;
      }
      setScanProgress(message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const newInvoices = invoices.filter(inv => !inv.isDuplicate);
  const duplicateInvoices = invoices.filter(inv => inv.isDuplicate);
  const approvedCount = invoices.filter(inv => inv.status === 'approved').length;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'גבוה';
      case 'medium': return 'בינוני';
      case 'low': return 'נמוך';
      default: return confidence;
    }
  };

  const monthNames = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const hasConnectedAccounts = accounts.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg border max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">סריקת מיילים</h2>
            <p className="text-xs text-gray-500">
              {useDateRange 
                ? `${startDate} - ${endDate}`
                : `${monthNames[month]} ${year}`
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="הגדרות"
          >
            <Settings className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b bg-blue-50/50 space-y-4">
          {/* Date Range Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4" />
              טווח תאריכים מותאם אישית
            </label>
            <button
              onClick={() => setUseDateRange(!useDateRange)}
              className={`relative w-11 h-6 rounded-full transition-colors ${useDateRange ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useDateRange ? 'right-1' : 'right-6'}`} />
            </button>
          </div>
          
          {useDateRange && (
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">מתאריך</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connected Accounts */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">חשבונות מחוברים</span>
          <button
            onClick={handleConnect}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            הוסף חשבון
          </button>
        </div>
        
        {loadingAccounts ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>טוען...</span>
          </div>
        ) : accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.email} className="flex items-center justify-between bg-white p-2 rounded-lg border">
                <div className="flex items-center gap-2 text-green-600">
                  <Link2 className="w-4 h-4" />
                  <span className="text-sm">{account.email}</span>
                </div>
                <button
                  onClick={() => handleDisconnect(account.email)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Link2Off className="w-3 h-3" />
                  נתק
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-3">לא מחוברים חשבונות Gmail</p>
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <Mail className="w-4 h-4" />
              התחבר ל-Gmail
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="p-3 mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="mr-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scan Button */}
        {hasConnectedAccounts && invoices.length === 0 && !scanning && (
          <div className="p-6 text-center">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
              <RefreshCw className="w-5 h-5" />
              {useDateRange 
                ? `סרוק מיילים`
                : `סרוק מיילים של ${monthNames[month]}`
              }
          </button>
          <p className="text-xs text-gray-500 mt-2">
            יחפש מיילים עם מילות מפתח: חשבונית, קבלה, invoice...
          </p>
        </div>
        )}

        {/* Scanning Progress */}
        {scanning && (
          <div className="p-8 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                <Mail className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">{scanProgress}</p>
                <p className="text-sm text-gray-500">זה יכול לקחת עד דקה</p>
              </div>
              <div className="flex gap-1 mt-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

      {/* Results */}
      {invoices.length > 0 && (
        <div className="p-4">
          {/* Summary */}
          <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">{newInvoices.length}</span> חשבוניות חדשות
              {duplicateInvoices.length > 0 && (
                <span className="text-yellow-600 mr-2">
                  • <span className="font-medium">{duplicateInvoices.length}</span> כפילויות
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={approveAll}
                className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
              >
                אשר הכל
              </button>
              <button
                onClick={rejectAll}
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                דחה הכל
              </button>
            </div>
          </div>

          {/* Invoice List */}
          <div className="space-y-2 max-h-96 overflow-auto">
            {newInvoices.map((invoice, index) => (
              <InvoiceRow
                key={`${invoice.emailId}-${invoice.attachmentId}`}
                invoice={invoice}
                onToggle={() => toggleInvoiceStatus(invoices.indexOf(invoice))}
                getConfidenceColor={getConfidenceColor}
                getConfidenceText={getConfidenceText}
              />
            ))}
          </div>

          {/* Duplicates Section */}
          {duplicateInvoices.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                className="flex items-center gap-2 text-sm text-yellow-600 hover:text-yellow-700"
              >
                {showDuplicates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <AlertTriangle className="w-4 h-4" />
                {duplicateInvoices.length} כפילויות אפשריות
              </button>
              
              {showDuplicates && (
                <div className="mt-2 space-y-2">
                  {duplicateInvoices.map((invoice, index) => (
                    <InvoiceRow
                      key={`dup-${invoice.emailId}-${invoice.attachmentId}`}
                      invoice={invoice}
                      onToggle={() => toggleInvoiceStatus(invoices.indexOf(invoice))}
                      getConfidenceColor={getConfidenceColor}
                      getConfidenceText={getConfidenceText}
                      isDuplicate
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Button */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {approvedCount} חשבוניות נבחרו להוספה
            </span>
            <button
              onClick={handleAddInvoices}
              disabled={adding || approvedCount === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מוסיף...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  הוסף {approvedCount} חשבוניות
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {scanProgress && invoices.some(inv => inv.status === 'added') && (
        <div className="p-3 mx-4 mb-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-4 h-4" />
          <span className="text-sm">{scanProgress}</span>
        </div>
      )}
      </div> {/* End scrollable content */}
    </div>
  );
}

// Sub-component for invoice row
function InvoiceRow({
  invoice,
  onToggle,
  getConfidenceColor,
  getConfidenceText,
  isDuplicate = false,
}: {
  invoice: ScannedInvoice;
  onToggle: () => void;
  getConfidenceColor: (c: string) => string;
  getConfidenceText: (c: string) => string;
  isDuplicate?: boolean;
}) {
  const isApproved = invoice.status === 'approved';
  const isAdded = invoice.status === 'added';
  
  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isAdded
          ? 'bg-green-50 border-green-200'
          : isApproved
          ? 'bg-white border-green-300'
          : 'bg-gray-50 border-gray-200 opacity-60'
      } ${isDuplicate ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={isAdded}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isAdded
              ? 'bg-green-500 border-green-500 cursor-default'
              : isApproved
              ? 'bg-green-500 border-green-500 hover:bg-green-600'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {(isApproved || isAdded) && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {invoice.extractedData.supplier_name}
            </span>
            <span className={`text-xs ${getConfidenceColor(invoice.extractedData.confidence)}`}>
              ({getConfidenceText(invoice.extractedData.confidence)})
            </span>
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{invoice.extractedData.invoice_date}</span>
            <span>•</span>
            <span className="truncate">{invoice.extractedData.description}</span>
          </div>
          
          {isDuplicate && invoice.matchReason && (
            <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {invoice.matchReason}
            </div>
          )}
          
          <div className="text-xs text-gray-400 mt-1 truncate">
            <FileText className="w-3 h-3 inline ml-1" />
            {invoice.filename}
          </div>
        </div>

        {/* Amount */}
        <div className="text-left">
          <div className="font-semibold text-gray-900">
            {formatCurrency(invoice.extractedData.amount)}
          </div>
          {invoice.extractedData.has_vat && invoice.extractedData.vat_amount > 0 && (
            <div className="text-xs text-green-600">
              מע"מ: {formatCurrency(invoice.extractedData.vat_amount)}
            </div>
          )}
          {!invoice.extractedData.has_vat && (
            <div className="text-xs text-gray-400">ללא מע"מ</div>
          )}
        </div>
      </div>
    </div>
  );
}
