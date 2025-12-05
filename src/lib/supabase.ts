import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  DAILY_DATA: 'daily_cashflow',
  SETTINGS: 'settings',
  PRODUCT_COSTS: 'product_costs',
  ORDER_ITEM_COSTS: 'order_item_costs',
  EXPENSES_VAT: 'expenses_vat',
  EXPENSES_NO_VAT: 'expenses_no_vat',
} as const;
