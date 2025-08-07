-- Update recipes table to add missing columns
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS cookTimeISO TEXT,
ADD COLUMN IF NOT EXISTS prepTimeISO TEXT,
ADD COLUMN IF NOT EXISTS totalTimeISO TEXT;

-- Update ingredients table to add missing columns
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS commonNames JSONB;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ingredients' 
ORDER BY ordinal_position; 