-- Create pending_invitations table for user invitations
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(business_id, email)
);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see invitations for businesses they manage
CREATE POLICY "Users can view invitations for their businesses" ON pending_invitations
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can create invitations
CREATE POLICY "Admins can create invitations" ON pending_invitations
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete invitations
CREATE POLICY "Admins can delete invitations" ON pending_invitations
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to process pending invitations when a user signs up
CREATE OR REPLACE FUNCTION process_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- Find any pending invitations for this email
  INSERT INTO user_businesses (user_id, business_id, role, invited_by, invited_at)
  SELECT 
    NEW.id as user_id,
    pi.business_id,
    pi.role,
    pi.invited_by,
    pi.created_at
  FROM pending_invitations pi
  WHERE LOWER(pi.email) = LOWER(NEW.email)
    AND pi.expires_at > NOW();
  
  -- Delete processed invitations
  DELETE FROM pending_invitations 
  WHERE LOWER(email) = LOWER(NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created_process_invitations ON auth.users;
CREATE TRIGGER on_auth_user_created_process_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION process_pending_invitations();
