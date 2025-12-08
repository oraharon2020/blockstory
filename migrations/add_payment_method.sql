-- Add payment_method column to expenses tables
ALTER TABLE expenses_vat ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit';
ALTER TABLE expenses_no_vat ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit';

-- payment_method values: 'credit' (אשראי), 'bank_transfer' (העברה בנקאית)
