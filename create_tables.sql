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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, line_item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_product_name ON product_costs(product_name);
CREATE INDEX IF NOT EXISTS idx_order_item_costs_order_id ON order_item_costs(order_id);
