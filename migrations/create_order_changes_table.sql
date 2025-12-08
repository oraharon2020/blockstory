-- Table to track order changes from WooCommerce webhooks
CREATE TABLE IF NOT EXISTS order_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  order_id INTEGER NOT NULL,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', 'total_changed'
  old_value JSONB, -- Previous values
  new_value JSONB, -- New values
  changes_summary TEXT, -- Human readable summary in Hebrew
  is_read BOOLEAN DEFAULT FALSE,
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_order_changes_business_id ON order_changes(business_id);
CREATE INDEX IF NOT EXISTS idx_order_changes_order_id ON order_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_changes_is_read ON order_changes(is_read);
CREATE INDEX IF NOT EXISTS idx_order_changes_created_at ON order_changes(created_at DESC);

-- Enable RLS
ALTER TABLE order_changes ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Users can view their business order changes" ON order_changes
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
      UNION
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert order changes" ON order_changes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their business order changes" ON order_changes
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
      UNION
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );
