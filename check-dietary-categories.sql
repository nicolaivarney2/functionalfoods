-- Check dietaryCategories field in recipes table
SELECT 
  id, 
  title, 
  "dietaryCategories",
  CASE 
    WHEN "dietaryCategories" IS NULL THEN 'NULL'
    WHEN "dietaryCategories" = '[]' THEN 'EMPTY_ARRAY'
    ELSE 'HAS_DATA'
  END as status
FROM recipes 
LIMIT 10;
