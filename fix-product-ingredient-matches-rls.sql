-- Fix RLS policies for product_ingredient_matches to allow service role inserts
-- This ensures that API calls using service role key can insert matches

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to product_ingredient_matches" ON product_ingredient_matches;
DROP POLICY IF EXISTS "Allow authenticated users to insert product_ingredient_matches" ON product_ingredient_matches;
DROP POLICY IF EXISTS "Allow authenticated users to update product_ingredient_matches" ON product_ingredient_matches;
DROP POLICY IF EXISTS "Allow authenticated users to delete product_ingredient_matches" ON product_ingredient_matches;

-- Create new policies that allow service role (bypass RLS) and public access
-- Service role key bypasses RLS, but we still need policies for anon key if used
CREATE POLICY "Allow public read access to product_ingredient_matches" 
  ON product_ingredient_matches 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow service role to insert product_ingredient_matches" 
  ON product_ingredient_matches 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow service role to update product_ingredient_matches" 
  ON product_ingredient_matches 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow service role to delete product_ingredient_matches" 
  ON product_ingredient_matches 
  FOR DELETE 
  USING (true);

-- Verify policies
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
WHERE tablename = 'product_ingredient_matches';


