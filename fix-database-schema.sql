-- Fix recipes table - add missing columns
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS cookingTime INTEGER,
ADD COLUMN IF NOT EXISTS totalTime INTEGER,
ADD COLUMN IF NOT EXISTS dietaryCategories JSONB,
ADD COLUMN IF NOT EXISTS ingredientGroups JSONB,
ADD COLUMN IF NOT EXISTS instructionGroups JSONB,
ADD COLUMN IF NOT EXISTS rating DECIMAL,
ADD COLUMN IF NOT EXISTS reviewCount INTEGER,
ADD COLUMN IF NOT EXISTS prepTimeISO TEXT,
ADD COLUMN IF NOT EXISTS cookTimeISO TEXT,
ADD COLUMN IF NOT EXISTS totalTimeISO TEXT;

-- Fix ingredients table - add missing columns
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS exclusions JSONB,
ADD COLUMN IF NOT EXISTS allergens JSONB,
ADD COLUMN IF NOT EXISTS commonNames JSONB,
ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS nutritionalInfo JSONB;

-- Verify the changes
SELECT 'recipes' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;

SELECT 'ingredients' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ingredients' 
ORDER BY ordinal_position; 