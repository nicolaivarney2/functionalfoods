-- Add scheduling columns to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS "scheduledDate" DATE;

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS "scheduledTime" TIME;

-- Verify the changes
SELECT 
  id,
  title,
  status,
  "scheduledDate",
  "scheduledTime",
  "publishedAt"
FROM recipes 
ORDER BY "createdAt" DESC 
LIMIT 5;
