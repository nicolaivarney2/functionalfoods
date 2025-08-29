-- Add missing nutrition columns to recipes table
-- Run this script to update existing database schema

-- Add vitamins and minerals columns
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS vitamins JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS minerals JSONB DEFAULT '{}';

-- Add total nutrition columns
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS total_calories INTEGER,
ADD COLUMN IF NOT EXISTS total_protein DECIMAL,
ADD COLUMN IF NOT EXISTS total_carbs DECIMAL,
ADD COLUMN IF NOT EXISTS total_fat DECIMAL,
ADD COLUMN IF NOT EXISTS total_fiber DECIMAL;

-- Update existing recipes to have default values
UPDATE recipes 
SET 
  vitamins = '{}',
  minerals = '{}',
  total_calories = calories,
  total_protein = protein,
  total_carbs = carbs,
  total_fat = fat,
  total_fiber = fiber
WHERE vitamins IS NULL OR minerals IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'recipes' 
  AND column_name IN ('vitamins', 'minerals', 'total_calories', 'total_protein', 'total_carbs', 'total_fat', 'total_fiber')
ORDER BY column_name;
