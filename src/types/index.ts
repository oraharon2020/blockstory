// Types for the cashflow management system

export interface WooCommerceSettings {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface SupabaseSettings {
  url: string;
  anonKey: string;
}

export interface Settings {
  woocommerce: WooCommerceSettings;
  supabase: SupabaseSettings;
  vatRate: number; // מע"מ
  defaultMaterialsCost: number; // עלות חומרי גלם ברירת מחדל באחוזים
}

export interface DailyData {
  id?: string;
  date: string; // YYYY-MM-DD
  revenue: number; // הכנסות
  ordersCount: number; // מספר הזמנות
  itemsCount?: number; // מספר מוצרים שנמכרו
  googleAdsCost: number; // הוצאות פרסום גוגל
  facebookAdsCost: number; // הוצאות פרסום פייסבוק
  tiktokAdsCost: number; // הוצאות פרסום טיקטוק
  shippingCost: number; // הוצאות משלוח
  materialsCost: number; // חומרי גלם
  creditCardFees: number; // עמלת אשראי
  vat: number; // מע"מ
  totalExpenses: number; // סך הוצאות
  profit: number; // רווח
  roi: number; // ROI
  created_at?: string;
  updated_at?: string;
}

export interface WooCommerceOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  shipping_total: string;
  payment_method: string;
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  averageROI: number;
  ordersCount: number;
  daysData: DailyData[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameHe: string;
  color: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'google_ads', name: 'Google Ads', nameHe: 'הוצאות פרסום גוגל', color: '#4285F4' },
  { id: 'facebook_ads', name: 'Facebook Ads', nameHe: 'הוצאות פרסום פייסבוק', color: '#1877F2' },
  { id: 'tiktok_ads', name: 'TikTok Ads', nameHe: 'הוצאות פרסום טיקטוק', color: '#000000' },
  { id: 'shipping', name: 'Shipping', nameHe: 'הוצאות משלוח', color: '#FF9800' },
  { id: 'materials', name: 'Materials', nameHe: 'חומרי גלם', color: '#4CAF50' },
  { id: 'credit_card', name: 'Credit Card Fees', nameHe: 'עמלת אשראי', color: '#9C27B0' },
  { id: 'vat', name: 'VAT', nameHe: 'מע"מ', color: '#F44336' },
];
