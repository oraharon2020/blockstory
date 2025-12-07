// Types for Supplier Orders Management

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SupplierOrder {
  id: number;
  order_id: number;
  item_id: number;
  product_id: number;
  product_name: string;
  variation_key?: string;
  variation_attributes?: Record<string, string>;
  unit_cost: number;
  adjusted_cost?: number | null;
  quantity: number;
  shipping_cost?: number;
  supplier_name: string;
  supplier_id?: string;
  order_date: string;
  is_ready: boolean;
  notes?: string | null;
  business_id: string;
  updated_at: string;
  // Joined fields from WooCommerce
  order_number: string;
  order_status: string;
  total: string;
  customer_name?: string;
  customer_first_name: string;
  customer_last_name: string;
}

export interface FilterOptions {
  filterType: 'date' | 'orders';
  startDate: string;
  endDate: string;
  orderIds: string;
  statuses: string[];
  searchTerm: string;
  showReadyOnly: boolean;
  showNotReadyOnly: boolean;
}

export interface OrderStatus {
  slug: string;
  name: string;
}

export interface PDFReportData {
  supplier: Supplier;
  orders: SupplierOrder[];
  generatedAt: string;
  dateRange?: {
    start: string;
    end: string;
  };
  orderNumbers?: number[];
  totalCost: number;
}
