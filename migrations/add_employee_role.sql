-- Add role column to employees table
-- Run this in Supabase SQL Editor

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS role TEXT;

-- Comment
COMMENT ON COLUMN employees.role IS 'תפקיד העובד (אופציונלי)';
