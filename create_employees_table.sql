-- Employees table for salary management
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Each employee appears once per month/year for each business
  UNIQUE(business_id, name, month, year)
);

-- Add employee_cost column to daily_cashflow if not exists
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS employee_cost DECIMAL(12,2) DEFAULT 0;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_employees_business_month ON employees(business_id, month, year);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy for viewing employees
CREATE POLICY "Users can view employees" ON employees
FOR SELECT USING (
  business_id IN (
    SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
  )
);

-- Policy for managing employees (admin/owner only)
CREATE POLICY "Admins can manage employees" ON employees
FOR ALL USING (
  business_id IN (
    SELECT business_id FROM user_businesses 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
