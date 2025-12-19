-- Recipe Categories Configuration Table
-- Kør dette script i din Supabase SQL editor

CREATE TABLE IF NOT EXISTS recipe_categories_config (
  id SERIAL PRIMARY KEY,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default categories if table is empty
INSERT INTO recipe_categories_config (categories, updated_by)
SELECT 
  '["Aftensmad", "Verden rundt", "Frokost", "Is og sommer", "Salater", "Fisk", "Morgenmad", "God til to dage", "Vegetar", "Tilbehør", "Bagværk", "Madpakke opskrifter", "Desserter", "Fatbombs", "Food prep", "Simre retter", "Dip og dressinger"]'::jsonb,
  'system'
WHERE NOT EXISTS (SELECT 1 FROM recipe_categories_config);

-- Enable RLS
ALTER TABLE recipe_categories_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Allow public read access to recipe categories" ON recipe_categories_config;
DROP POLICY IF EXISTS "Allow authenticated users to update recipe categories" ON recipe_categories_config;

-- Create policy for public read access
CREATE POLICY "Allow public read access to recipe categories" ON recipe_categories_config FOR SELECT USING (true);

-- Create policy for authenticated users to update
CREATE POLICY "Allow authenticated users to update recipe categories" ON recipe_categories_config FOR UPDATE USING (true);
