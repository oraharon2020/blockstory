-- Create customer_refunds table for tracking refunds
CREATE TABLE IF NOT EXISTS customer_refunds (
  id SERIAL PRIMARY KEY,
  refund_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  order_id INTEGER,
  customer_name VARCHAR(255),
  reason VARCHAR(255),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_refunds_business ON customer_refunds(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_refunds_date ON customer_refunds(refund_date);

-- Enable RLS
ALTER TABLE customer_refunds ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policy - Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON customer_refunds
  FOR ALL USING (true) WITH CHECK (true);
