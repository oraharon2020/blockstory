-- Create invoices storage bucket
-- Run this in Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp'];

-- Allow public read access
CREATE POLICY "Public read access for invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices');

-- Allow users to delete their own invoices
CREATE POLICY "Users can delete their own invoices"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoices');
