-- Migration: Create manual_orders table
-- Date: 2026-01-06
-- Description: טבלה לשמירת הזמנות ידניות (לא מ-WooCommerce)

-- טבלת הזמנות ידניות
CREATE TABLE IF NOT EXISTS manual_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'completed',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- טבלת פריטים בהזמנות ידניות
CREATE TABLE IF NOT EXISTS manual_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES manual_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  supplier_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE manual_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for manual_orders
CREATE POLICY "Users can view manual_orders of their businesses" ON manual_orders
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert manual_orders to their businesses" ON manual_orders
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update manual_orders of their businesses" ON manual_orders
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete manual_orders of their businesses" ON manual_orders
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
  );

-- RLS policies for manual_order_items (via order_id relationship)
CREATE POLICY "Users can view manual_order_items" ON manual_order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM manual_orders WHERE business_id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert manual_order_items" ON manual_order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM manual_orders WHERE business_id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update manual_order_items" ON manual_order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM manual_orders WHERE business_id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete manual_order_items" ON manual_order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM manual_orders WHERE business_id IN (
        SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manual_orders_business_date ON manual_orders(business_id, order_date);
CREATE INDEX IF NOT EXISTS idx_manual_order_items_order ON manual_order_items(order_id);

-- Function for updated_at (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_manual_orders_updated_at
  BEFORE UPDATE ON manual_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
