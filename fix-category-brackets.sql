-- Fix category names by removing brackets
-- Run this in your Supabase SQL editor

-- First, let's see what categories we have with brackets
SELECT DISTINCT 
  "dietaryCategories",
  "mainCategory",
  "subCategories"
FROM recipes 
WHERE 
  "dietaryCategories"::text LIKE '%[%' OR 
  "dietaryCategories"::text LIKE '%]%' OR
  "mainCategory" LIKE '%[%' OR 
  "mainCategory" LIKE '%]%' OR
  "subCategories"::text LIKE '%[%' OR 
  "subCategories"::text LIKE '%]%';

-- Update dietaryCategories - remove brackets from array elements
UPDATE recipes 
SET "dietaryCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(value) = 'string' 
      THEN to_jsonb(replace(replace(value::text, '[', ''), ']', ''))
      ELSE value
    END
  )
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories"::text LIKE '%[%' OR "dietaryCategories"::text LIKE '%]%';

-- Update mainCategory - remove brackets
UPDATE recipes 
SET "mainCategory" = replace(replace("mainCategory", '[', ''), ']', '')
WHERE "mainCategory" LIKE '%[%' OR "mainCategory" LIKE '%]%';

-- Update subCategories - remove brackets from array elements
UPDATE recipes 
SET "subCategories" = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(value) = 'string' 
      THEN to_jsonb(replace(replace(value::text, '[', ''), ']', ''))
      ELSE value
    END
  )
  FROM jsonb_array_elements("subCategories")
)
WHERE "subCategories"::text LIKE '%[%' OR "subCategories"::text LIKE '%]%';

-- Verify the changes
SELECT DISTINCT 
  "dietaryCategories",
  "mainCategory",
  "subCategories"
FROM recipes 
LIMIT 10;
