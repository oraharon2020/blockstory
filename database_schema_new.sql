-- ==============================================
-- סכמת בסיס נתונים - עדכונים חדשים
-- תאריך: דצמבר 2025
-- ==============================================

-- ============================================
-- 1. טבלת ספקים (SUPPLIERS)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- אינדקס לחיפוש לפי עסק
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);

-- ============================================
-- 2. טבלת עובדים (EMPLOYEES)
-- ניהול עובדים ושכר לפי חודש
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    salary DECIMAL(10, 2) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, name, month, year)
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_month_year ON employees(business_id, month, year);

-- ============================================
-- 3. עדכון טבלת daily_cashflow - הוספת tiktokAdsCost
-- ============================================
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS tiktok_ads_cost DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- 4. עדכון טבלת הוצאות - וידוא business_id
-- ============================================
ALTER TABLE expenses_vat 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE expenses_no_vat 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_vat_business ON expenses_vat(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_no_vat_business ON expenses_no_vat(business_id);

-- ============================================
-- 5. עדכון טבלת עלויות מוצרים - הוספת supplier_name
-- ============================================
ALTER TABLE product_costs 
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);

-- ============================================
-- 6. עדכון טבלת עלויות פריטים בהזמנה - הוספת supplier_name
-- ============================================
ALTER TABLE order_item_costs 
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);

-- ============================================
-- סיכום מה להריץ:
-- ============================================
-- 1. CREATE TABLE suppliers - טבלת ספקים חדשה
-- 2. CREATE TABLE employees - טבלת עובדים חדשה
-- 3. ALTER daily_cashflow - עמודת tiktok_ads_cost
-- 4. ALTER expenses_vat/no_vat - עמודת business_id
-- 5. ALTER product_costs - עמודת supplier_name
-- 6. ALTER order_item_costs - עמודת supplier_name
-- ============================================
