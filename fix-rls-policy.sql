-- Fix RLS policy for image uploads
-- This script adds the necessary RLS policies for image processing

-- First, check if storage.buckets table exists and has proper policies
-- If not, create them

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Allow authenticated users to upload to storage
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update storage objects
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow public read access to storage objects
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (true);

-- Allow authenticated users to delete storage objects
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (auth.role() = 'authenticated');

-- Check if the recipes table has proper RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated recipe updates" ON recipes;
DROP POLICY IF EXISTS "Allow authenticated recipe inserts" ON recipes;

-- Allow authenticated users to update recipes
CREATE POLICY "Allow authenticated recipe updates" ON recipes
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert recipes
CREATE POLICY "Allow authenticated recipe inserts" ON recipes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('objects', 'recipes')
ORDER BY tablename, policyname;
