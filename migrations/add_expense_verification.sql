-- Add verification tracking to expenses tables
-- מאפשר ללקוח לסמן כל חשבונית שנבדקה מול הבנק/מסמך

ALTER TABLE expenses_vat ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses_vat ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE expenses_no_vat ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses_no_vat ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Index for quick filtering of unverified expenses
CREATE INDEX IF NOT EXISTS idx_expenses_vat_verified ON expenses_vat(is_verified);
CREATE INDEX IF NOT EXISTS idx_expenses_no_vat_verified ON expenses_no_vat(is_verified);
