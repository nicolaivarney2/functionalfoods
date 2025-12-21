-- Dietary Categories Configuration Table
-- Kør dette script i din Supabase SQL editor

CREATE TABLE IF NOT EXISTS dietary_categories_config (
  id SERIAL PRIMARY KEY,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default dietary categories if table is empty
INSERT INTO dietary_categories_config (categories, updated_by)
SELECT 
  '["Keto", "Sense", "GLP-1 kost", "Meal prep", "Anti-inflammatorisk", "Fleksitarisk", "5:2 diæt", "Familiemad", "Low carb"]'::jsonb,
  'system'
WHERE NOT EXISTS (SELECT 1 FROM dietary_categories_config);

-- Enable RLS
ALTER TABLE dietary_categories_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Allow public read access to dietary categories" ON dietary_categories_config;
DROP POLICY IF EXISTS "Allow authenticated users to update dietary categories" ON dietary_categories_config;

-- Create policy for public read access
CREATE POLICY "Allow public read access to dietary categories" ON dietary_categories_config FOR SELECT USING (true);

-- Create policy for authenticated users to update
CREATE POLICY "Allow authenticated users to update dietary categories" ON dietary_categories_config FOR UPDATE USING (true);


