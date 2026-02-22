-- Enable Row Level Security for blogs table
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read blogs
CREATE POLICY "Allow authenticated users to read blogs"
  ON blogs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert blogs
CREATE POLICY "Allow authenticated users to insert blogs"
  ON blogs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update blogs
CREATE POLICY "Allow authenticated users to update blogs"
  ON blogs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete blogs
CREATE POLICY "Allow authenticated users to delete blogs"
  ON blogs
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE blogs IS 'Blog posts with RLS policies for authenticated users';
