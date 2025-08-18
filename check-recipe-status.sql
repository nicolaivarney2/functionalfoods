-- Check recipe status in database
SELECT 
  id,
  title,
  status,
  "publishedAt",
  "createdAt",
  "updatedAt"
FROM recipes 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check if status column exists and what values it contains
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'recipes' 
AND column_name = 'status';

-- Check unique status values
SELECT DISTINCT status, COUNT(*) as count
FROM recipes 
GROUP BY status;

-- Check all columns in recipes table to see what we actually have
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;
