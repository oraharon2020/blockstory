-- =====================================================
-- Multi-Tenant Tables for CRM
-- =====================================================

-- 1. Businesses table - stores all businesses
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. User-Business relationship with roles
-- Roles: 'owner' (full access), 'admin' (manage), 'viewer' (read-only)
CREATE TABLE IF NOT EXISTS user_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, business_id)
);

-- 3. Business settings (WooCommerce credentials, etc.)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(business_id, key)
);

-- 4. Business columns configuration (which columns to show)
CREATE TABLE IF NOT EXISTS business_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  column_name TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(business_id, column_key)
);

-- =====================================================
-- Update existing tables to add business_id
-- =====================================================

-- Add business_id to daily_cashflow
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Add business_id to product_costs
ALTER TABLE product_costs 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Add business_id to order_item_costs
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Add business_id to expenses_vat
ALTER TABLE expenses_vat 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Add business_id to expenses_no_vat
ALTER TABLE expenses_no_vat 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_businesses_user ON user_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_business ON user_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_business ON business_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_daily_cashflow_business ON daily_cashflow(business_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_business ON product_costs(business_id);
CREATE INDEX IF NOT EXISTS idx_order_item_costs_business ON order_item_costs(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vat_business ON expenses_vat(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_no_vat_business ON expenses_no_vat(business_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses_vat ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses_no_vat ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see businesses they have access to
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

-- Policy: Owners can update their businesses
CREATE POLICY "Owners can update businesses" ON businesses
  FOR UPDATE USING (
    id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Policy: Users can see their business memberships
CREATE POLICY "Users can view their memberships" ON user_businesses
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Owners/Admins can manage memberships
CREATE POLICY "Admins can manage memberships" ON user_businesses
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view settings of their businesses
CREATE POLICY "Users can view business settings" ON business_settings
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

-- Policy: Owners/Admins can manage settings
CREATE POLICY "Admins can manage settings" ON business_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view columns of their businesses
CREATE POLICY "Users can view business columns" ON business_columns
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

-- Policy: Admins can manage columns
CREATE POLICY "Admins can manage columns" ON business_columns
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Similar policies for data tables
CREATE POLICY "Users can view cashflow" ON daily_cashflow
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage cashflow" ON daily_cashflow
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Repeat for other tables...
CREATE POLICY "Users can view product_costs" ON product_costs
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage product_costs" ON product_costs
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view order_item_costs" ON order_item_costs
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage order_item_costs" ON order_item_costs
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view expenses_vat" ON expenses_vat
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage expenses_vat" ON expenses_vat
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view expenses_no_vat" ON expenses_no_vat
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage expenses_no_vat" ON expenses_no_vat
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Default columns template
-- =====================================================

-- Function to create default columns for new business
CREATE OR REPLACE FUNCTION create_default_columns(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_columns (business_id, column_key, column_name, is_visible, sort_order) VALUES
    (p_business_id, 'day', 'יום', true, 1),
    (p_business_id, 'date', 'תאריך', true, 2),
    (p_business_id, 'revenue', 'הכנסות', true, 3),
    (p_business_id, 'ordersCount', 'הזמנות', true, 4),
    (p_business_id, 'googleAdsCost', 'גוגל', true, 5),
    (p_business_id, 'facebookAdsCost', 'פייסבוק', true, 6),
    (p_business_id, 'tiktokAdsCost', 'טיקטוק', false, 7),
    (p_business_id, 'shippingCost', 'משלוח', true, 8),
    (p_business_id, 'materialsCost', 'חומרים', true, 9),
    (p_business_id, 'creditCardFees', 'אשראי', true, 10),
    (p_business_id, 'expensesVat', 'מוכר', true, 11),
    (p_business_id, 'expensesNoVat', 'חו"ל', true, 12),
    (p_business_id, 'vat', 'מע"מ', true, 13),
    (p_business_id, 'totalExpenses', 'הוצאות', true, 14),
    (p_business_id, 'profit', 'רווח', true, 15),
    (p_business_id, 'roi', 'ROI', true, 16);
END;
$$ LANGUAGE plpgsql;
