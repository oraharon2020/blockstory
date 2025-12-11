-- Add file_url column to expenses tables
-- Run this in Supabase SQL Editor

-- Add to expenses_vat
ALTER TABLE expenses_vat 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add to expenses_no_vat  
ALTER TABLE expenses_no_vat
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create storage bucket for invoices (run in Storage section or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);
