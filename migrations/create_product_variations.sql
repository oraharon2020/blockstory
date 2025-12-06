-- Migration: Create product_variations table for variation-level costs
-- Run this in Supabase SQL Editor

-- טבלת עלויות לפי וריאציה
-- כל מוצר יכול להיות עם כמה וריאציות, וכל וריאציה יכולה להיות אצל כמה ספקים
CREATE TABLE IF NOT EXISTS product_variation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- מזהי המוצר
  product_id INTEGER NOT NULL,           -- מזהה מוצר מ-WooCommerce
  product_name VARCHAR(500) NOT NULL,    -- שם המוצר
  
  -- וריאציה
  variation_id INTEGER,                  -- מזהה וריאציה מ-WooCommerce (אם קיים)
  variation_key VARCHAR(500),            -- מפתח וריאציה (למשל: "S_לבן" או "מידה: L, צבע: כחול")
  variation_attributes JSONB,            -- תכונות הוריאציה כ-JSON
  
  -- ספק ועלות
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),            -- שם ספק (גם אם לא מקושר לטבלת suppliers)
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  sku VARCHAR(100),                      -- מק"ט אצל הספק
  
  -- מטא
  is_default BOOLEAN DEFAULT false,      -- האם זו עלות ברירת מחדל לוריאציה זו
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- אינדקס ייחודי - מוצר+וריאציה+ספק (התעלם מ-NULL בספק)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pvc_unique 
ON product_variation_costs(business_id, product_id, COALESCE(variation_key, ''), COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- אינדקסים לחיפוש מהיר
CREATE INDEX IF NOT EXISTS idx_pvc_business_id ON product_variation_costs(business_id);
CREATE INDEX IF NOT EXISTS idx_pvc_product_id ON product_variation_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_pvc_variation_key ON product_variation_costs(variation_key);
CREATE INDEX IF NOT EXISTS idx_pvc_supplier_id ON product_variation_costs(supplier_id);

-- Enable RLS
ALTER TABLE product_variation_costs ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "product_variation_costs_policy" ON product_variation_costs
  FOR ALL USING (true);

-- הוספת עמודות לטבלת order_item_costs לשמירת וריאציה וספק
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS variation_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS variation_attributes JSONB,
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- אינדקס על variation_key ב-order_item_costs
CREATE INDEX IF NOT EXISTS idx_oic_variation_key ON order_item_costs(variation_key);
