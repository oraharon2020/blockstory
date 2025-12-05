-- Product costs table - stores default costs per product
CREATE TABLE IF NOT EXISTS product_costs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  sku TEXT,
  product_name TEXT NOT NULL,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order item costs table - stores costs per order line item
CREATE TABLE IF NOT EXISTS order_item_costs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  line_item_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT,
  item_cost DECIMAL(10, 2) DEFAULT 0,
  order_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, line_item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_product_name ON product_costs(product_name);
CREATE INDEX IF NOT EXISTS idx_order_item_costs_order_id ON order_item_costs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_costs_order_date ON order_item_costs(order_date);

-- Expenses with VAT (Israeli suppliers - VAT deductible)
CREATE TABLE IF NOT EXISTS expenses_vat (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) DEFAULT 0,
  supplier_name TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses without VAT (Foreign suppliers - no VAT)
CREATE TABLE IF NOT EXISTS expenses_no_vat (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  supplier_name TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expenses tables
CREATE INDEX IF NOT EXISTS idx_expenses_vat_date ON expenses_vat(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_no_vat_date ON expenses_no_vat(expense_date);
