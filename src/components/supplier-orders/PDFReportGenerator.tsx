'use client';

import React, { useState } from 'react';
import { FileText, ChevronDown, Building2, Edit3 } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { SupplierOrder } from './types';

// Register Hebrew font
Font.register({
  family: 'Heebo',
  src: '/fonts/Heebo-VariableFont_wght.ttf',
});

interface GroupedOrders {
  [supplier: string]: SupplierOrder[];
}

interface PDFReportGeneratorProps {
  orders: SupplierOrder[];
  selectedStatuses: Set<string> | string[];
  availableSuppliers?: string[];
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Heebo',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  summaryContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    color: '#2563eb',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
  },
  supplierHeader: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  supplierName: {
    fontSize: 14,
    color: '#ffffff',
  },
  supplierSummary: {
    fontSize: 10,
    color: '#ffffff',
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  colReady: { width: '6%', textAlign: 'center' },
  colProduct: { width: '24%', textAlign: 'right' },
  colQty: { width: '8%', textAlign: 'center' },
  colCost: { width: '10%', textAlign: 'center' },
  colTotal: { width: '10%', textAlign: 'center' },
  colOrder: { width: '12%', textAlign: 'center' },
  colCustomer: { width: '18%', textAlign: 'right' },
  colStatus: { width: '12%', textAlign: 'center' },
  headerText: {
    fontSize: 9,
    color: '#374151',
  },
  cellText: {
    fontSize: 8,
    color: '#374151',
  },
  cellTextSmall: {
    fontSize: 7,
    color: '#666',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#666',
  },
});

const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'ממתין לתשלום',
    'processing': 'בטיפול',
    'on-hold': 'בהמתנה',
    'completed': 'הושלם',
    'cancelled': 'בוטל',
    'refunded': 'הוחזר',
    'failed': 'נכשל',
  };
  return statusMap[status] || status;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('he-IL');
};

const formatCurrency = (amount: number | string | null): string => {
  if (amount === null) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₪${num.toFixed(2)}`;
};

// PDF Document Component
const PDFDocument = ({ orders, selectedStatuses, supplierNameOverride }: PDFReportGeneratorProps & { supplierNameOverride?: string }) => {
  // If supplier override provided, replace "ללא ספק" with it
  const processedOrders = orders.map(item => ({
    ...item,
    supplier_name: item.supplier_name || supplierNameOverride || 'ללא ספק',
  }));

  const groupedOrders: GroupedOrders = processedOrders.reduce((acc, item) => {
    const supplier = item.supplier_name || 'ללא ספק';
    if (!acc[supplier]) {
      acc[supplier] = [];
    }
    acc[supplier].push(item);
    return acc;
  }, {} as GroupedOrders);

  const totalCost = processedOrders.reduce((sum, item) => {
    const cost = item.adjusted_cost ?? item.unit_cost ?? 0;
    return sum + (cost * item.quantity);
  }, 0);

  const totalItems = processedOrders.reduce((sum, item) => sum + item.quantity, 0);
  const statusArray = selectedStatuses ? Array.from(selectedStatuses as Iterable<string>) : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>דוח הזמנות ספקים</Text>
          <Text style={styles.subtitle}>
            תאריך הפקה: {new Date().toLocaleDateString('he-IL')} | {new Date().toLocaleTimeString('he-IL')}
          </Text>
          <Text style={styles.subtitle}>
            סטטוסים: {statusArray.map(s => getStatusLabel(s)).join(', ') || 'הכל'}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{orders.length}</Text>
            <Text style={styles.summaryLabel}>פריטים</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalItems}</Text>
            <Text style={styles.summaryLabel}>כמות כוללת</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalCost)}</Text>
            <Text style={styles.summaryLabel}>עלות כוללת</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Object.keys(groupedOrders).length}</Text>
            <Text style={styles.summaryLabel}>ספקים</Text>
          </View>
        </View>

        {/* Orders by supplier */}
        {Object.entries(groupedOrders).map(([supplier, items]) => {
          const supplierTotal = items.reduce((sum, item) => {
            const cost = item.adjusted_cost ?? item.unit_cost ?? 0;
            return sum + (cost * item.quantity);
          }, 0);
          const supplierQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

          return (
            <View key={supplier} wrap={false}>
              <View style={styles.supplierHeader}>
                <Text style={styles.supplierName}>{supplier}</Text>
                <Text style={styles.supplierSummary}>
                  {items.length} פריטים | כמות: {supplierQuantity} | סה״כ: {formatCurrency(supplierTotal)}
                </Text>
              </View>

              <View style={styles.table}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, styles.colReady]}>מוכן</Text>
                  <Text style={[styles.headerText, styles.colProduct]}>מוצר</Text>
                  <Text style={[styles.headerText, styles.colQty]}>כמות</Text>
                  <Text style={[styles.headerText, styles.colCost]}>עלות</Text>
                  <Text style={[styles.headerText, styles.colTotal]}>סה״כ</Text>
                  <Text style={[styles.headerText, styles.colOrder]}>הזמנה</Text>
                  <Text style={[styles.headerText, styles.colCustomer]}>לקוח</Text>
                  <Text style={[styles.headerText, styles.colStatus]}>סטטוס</Text>
                </View>

                {/* Table Rows */}
                {items.map((item, index) => {
                  const cost = item.adjusted_cost ?? item.unit_cost ?? 0;
                  const lineTotal = cost * item.quantity;
                  return (
                    <View 
                      key={`${item.order_id}-${item.id}-${index}`} 
                      style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : {}]}
                    >
                      <Text style={[styles.cellText, styles.colReady]}>
                        {item.is_ready ? '✓' : ''}
                      </Text>
                      <View style={styles.colProduct}>
                        <Text style={styles.cellText}>{item.product_name || ''}</Text>
                        {item.notes && <Text style={styles.cellTextSmall}>הערה: {item.notes}</Text>}
                      </View>
                      <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
                      <Text style={[styles.cellText, styles.colCost]}>{formatCurrency(cost)}</Text>
                      <Text style={[styles.cellText, styles.colTotal]}>{formatCurrency(lineTotal)}</Text>
                      <View style={styles.colOrder}>
                        <Text style={styles.cellText}>#{item.order_number || ''}</Text>
                        <Text style={styles.cellTextSmall}>{item.order_date ? formatDate(item.order_date) : ''}</Text>
                      </View>
                      <Text style={[styles.cellText, styles.colCustomer]}>
                        {item.customer_first_name || ''} {item.customer_last_name || ''}
                      </Text>
                      <Text style={[styles.cellText, styles.colStatus]}>
                        {getStatusLabel(item.order_status || '')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>דוח זה הופק אוטומטית ממערכת ניהול ההזמנות</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function PDFReportGenerator({ orders, selectedStatuses, availableSuppliers = [] }: PDFReportGeneratorProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [supplierForReport, setSupplierForReport] = useState('');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get unique suppliers from orders
  const uniqueSuppliersFromOrders = Array.from(new Set(orders.map(o => o.supplier_name).filter(Boolean)));
  const allSuppliers = Array.from(new Set([...availableSuppliers, ...uniqueSuppliersFromOrders]));

  const generatePDF = async () => {
    try {
      const supplierOverride = showCustomInput ? customSupplierName : supplierForReport;
      const blob = await pdf(
        <PDFDocument 
          orders={orders} 
          selectedStatuses={selectedStatuses} 
          supplierNameOverride={supplierOverride || undefined}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
      const supplierSuffix = supplierOverride ? `_${supplierOverride}` : '';
      link.download = `דוח_הזמנות_ספקים${supplierSuffix}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowOptions(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('שגיאה ביצירת הPDF');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={orders.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span>ייצא לPDF</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
      </button>

      {showOptions && (
        <div className="absolute z-30 mt-2 w-72 bg-white border rounded-xl shadow-lg p-4 left-0" dir="rtl">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            שם ספק לדוח
          </h4>
          
          <p className="text-xs text-gray-500 mb-3">
            בחר ספק או הזן שם ידנית (יחליף "ללא ספק")
          </p>

          {/* Toggle between dropdown and custom input */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowCustomInput(false)}
              className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                !showCustomInput ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              בחר מרשימה
            </button>
            <button
              onClick={() => setShowCustomInput(true)}
              className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-1 ${
                showCustomInput ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              הזן ידנית
            </button>
          </div>

          {showCustomInput ? (
            <input
              type="text"
              placeholder="הזן שם ספק..."
              value={customSupplierName}
              onChange={(e) => setCustomSupplierName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            />
          ) : (
            <select
              value={supplierForReport}
              onChange={(e) => setSupplierForReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            >
              <option value="">ללא שינוי (ברירת מחדל)</option>
              {allSuppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <button
              onClick={generatePDF}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              הורד PDF
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
