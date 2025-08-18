-- Check if there are any scheduled recipes in the database
SELECT 
  id,
  title,
  status,
  "scheduledDate",
  "scheduledTime",
  "createdAt"
FROM recipes 
WHERE status = 'scheduled'
ORDER BY "scheduledDate", "scheduledTime";

-- Check all recipes and their status
SELECT 
  status,
  COUNT(*) as count
FROM recipes 
GROUP BY status
ORDER BY count DESC;

-- Check if scheduling columns exist
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'recipes' 
AND column_name IN ('scheduledDate', 'scheduledTime', 'status')
ORDER BY column_name;
