'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';

// Register Hebrew font
Font.register({
  family: 'Heebo',
  src: '/fonts/Heebo-VariableFont_wght.ttf',
});

interface OrderItem {
  id: number;
  product_name: string;
  name?: string;
  quantity: number;
  unit_cost: number | null;
  cost?: number | null;
  adjusted_cost?: number | null;
  is_ready?: boolean;
  notes?: string;
  supplier_name: string | null;
  order_id: number;
  order_number: string;
  order_date: string;
  order_status: string;
  total: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_name?: string;
}

interface GroupedOrders {
  [supplier: string]: OrderItem[];
}

interface PDFReportGeneratorProps {
  orders: OrderItem[];
  selectedStatuses: Set<string> | string[];
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
const PDFDocument = ({ orders, selectedStatuses }: PDFReportGeneratorProps) => {
  const groupedOrders: GroupedOrders = orders.reduce((acc, item) => {
    const supplier = item.supplier_name || 'ללא ספק';
    if (!acc[supplier]) {
      acc[supplier] = [];
    }
    acc[supplier].push(item);
    return acc;
  }, {} as GroupedOrders);

  const totalCost = orders.reduce((sum, item) => {
    const cost = item.adjusted_cost ?? item.unit_cost ?? 0;
    return sum + (cost * item.quantity);
  }, 0);

  const totalItems = orders.reduce((sum, item) => sum + item.quantity, 0);
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
                        <Text style={styles.cellText}>{item.product_name || item.name || ''}</Text>
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

export default function PDFReportGenerator({ orders, selectedStatuses }: PDFReportGeneratorProps) {
  const generatePDF = async () => {
    try {
      const blob = await pdf(<PDFDocument orders={orders} selectedStatuses={selectedStatuses} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
      link.download = `דוח_הזמנות_ספקים_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('שגיאה ביצירת הPDF');
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={orders.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <FileText className="w-4 h-4" />
      <span>ייצא לPDF</span>
    </button>
  );
}
