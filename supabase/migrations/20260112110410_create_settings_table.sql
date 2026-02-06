-- Create settings table for website/hotel configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- SEO & Metadata
  site_title TEXT DEFAULT 'Dashboard Yhotel',
  site_description TEXT DEFAULT 'Dashboard for Yhotel',
  
  -- Hero Images (array of image URLs)
  hero_images JSONB DEFAULT '[]'::jsonb,
  
  -- Contact Information
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  
  -- Working Hours
  working_hours TEXT, -- JSON string or text format
  
  -- Social Media Links
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  
  -- Bank Account Information
  bank_account_number TEXT,
  bank_name TEXT,
  bank_bin TEXT,
  bank_account_owner TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update updated_at
CREATE TRIGGER update_settings_updated_at_trigger
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Insert default settings row (singleton pattern)
INSERT INTO settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
ON settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admin and manager can update settings
CREATE POLICY "Admin and manager can update settings"
ON settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

