-- Supabase SQL Schema for Cashflow CRM
-- Run this in your Supabase SQL Editor

-- Daily cashflow data table
CREATE TABLE IF NOT EXISTS daily_cashflow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  google_ads_cost DECIMAL(12,2) DEFAULT 0,
  facebook_ads_cost DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  materials_cost DECIMAL(12,2) DEFAULT 0,
  credit_card_fees DECIMAL(12,2) DEFAULT 0,
  vat DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  roi DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  woo_url TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  vat_rate DECIMAL(5,2) DEFAULT 17,
  materials_rate DECIMAL(5,2) DEFAULT 30,
  credit_card_rate DECIMAL(5,2) DEFAULT 2.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT settings_singleton CHECK (id = 1)
);

-- Enable Row Level Security
ALTER TABLE daily_cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you may want to restrict this in production)
CREATE POLICY "Allow public access to daily_cashflow" ON daily_cashflow
  FOR ALL USING (true);

CREATE POLICY "Allow public access to settings" ON settings
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_cashflow_date ON daily_cashflow(date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_daily_cashflow_updated_at
  BEFORE UPDATE ON daily_cashflow
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
