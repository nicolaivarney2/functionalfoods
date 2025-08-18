-- Add status column to recipes table if it doesn't exist
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published'));

-- Add publishedAt column if it doesn't exist
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP WITH TIME ZONE;

-- Update existing recipes to have draft status
UPDATE recipes 
SET status = 'draft' 
WHERE status IS NULL;

-- Verify the changes
SELECT 
  id,
  title,
  status,
  "publishedAt",
  "createdAt",
  "updatedAt"
FROM recipes 
ORDER BY "createdAt" DESC 
LIMIT 5;
