-- Add missing columns to daily_cashflow table
-- These columns are calculated by the frontend but not stored in the database

-- Employee daily cost (monthly salary / days in month)
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS employee_cost DECIMAL(10,2) DEFAULT 0;

-- Customer refunds for the day
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS refunds_amount DECIMAL(10,2) DEFAULT 0;

-- Expenses with VAT (spread across month or exact date based on settings)
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS expenses_vat_amount DECIMAL(10,2) DEFAULT 0;

-- Expenses without VAT / foreign expenses (spread across month)
ALTER TABLE daily_cashflow 
ADD COLUMN IF NOT EXISTS expenses_no_vat_amount DECIMAL(10,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN daily_cashflow.employee_cost IS 'Daily employee cost (total monthly salaries / days in month)';
COMMENT ON COLUMN daily_cashflow.refunds_amount IS 'Customer refunds for this day';
COMMENT ON COLUMN daily_cashflow.expenses_vat_amount IS 'Expenses with VAT (spread or exact based on settings)';
COMMENT ON COLUMN daily_cashflow.expenses_no_vat_amount IS 'Expenses without VAT / foreign (spread across month)';
