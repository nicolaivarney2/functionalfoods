-- 🔧 Fix opskrifter hvor dietary categories er sat forkert som mainCategory
-- Kør check-category-misplacement.sql først for at se problemet

-- ========================================
-- FIX: Flyt dietary categories fra mainCategory til dietaryCategories
-- ========================================

-- 1. Fix opskrifter hvor mainCategory = 'Keto'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Keto"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" = 'Keto'
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Keto%'));

-- Hvis subCategories er tom, sæt mainCategory til 'Aftensmad'
UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Keto"]'::jsonb
WHERE "mainCategory" = 'Keto'
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Keto%'));

-- 2. Fix opskrifter hvor mainCategory = 'Meal prep' eller 'Meal Prep'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Meal prep"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" IN ('Meal prep', 'Meal Prep')
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Meal prep%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Meal prep"]'::jsonb
WHERE "mainCategory" IN ('Meal prep', 'Meal Prep')
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Meal prep%'));

-- 3. Fix opskrifter hvor mainCategory = 'Fleksitarisk'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Fleksitarisk"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" = 'Fleksitarisk'
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Fleksitarisk%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Fleksitarisk"]'::jsonb
WHERE "mainCategory" = 'Fleksitarisk'
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Fleksitarisk%'));

-- 4. Fix opskrifter hvor mainCategory = 'Sense' eller 'SENSE'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Sense"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" IN ('Sense', 'SENSE')
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Sense%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Sense"]'::jsonb
WHERE "mainCategory" IN ('Sense', 'SENSE')
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Sense%'));

-- 5. Fix opskrifter hvor mainCategory = 'GLP-1 kost' eller varianter
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["GLP-1 kost"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" IN ('GLP-1 kost', 'GLP-1', 'glp-1', 'glp1')
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%GLP-1%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["GLP-1 kost"]'::jsonb
WHERE "mainCategory" IN ('GLP-1 kost', 'GLP-1', 'glp-1', 'glp1')
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%GLP-1%'));

-- 6. Fix opskrifter hvor mainCategory = 'Anti-inflammatorisk' eller varianter
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Anti-inflammatorisk"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" ILIKE '%anti%inflammatorisk%'
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Anti-inflammatorisk%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Anti-inflammatorisk"]'::jsonb
WHERE "mainCategory" ILIKE '%anti%inflammatorisk%'
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Anti-inflammatorisk%'));

-- 7. Fix opskrifter hvor mainCategory = 'Familiemad'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Familiemad"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" = 'Familiemad'
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Familiemad%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Familiemad"]'::jsonb
WHERE "mainCategory" = 'Familiemad'
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Familiemad%'));

-- 8. Fix opskrifter hvor mainCategory = 'Low carb'
UPDATE recipes
SET 
  "mainCategory" = COALESCE(
    (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1),
    'Aftensmad'
  ),
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Low carb"]'::jsonb,
  "subCategories" = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements("subCategories")
    WHERE value::text != (SELECT value::text FROM jsonb_array_elements_text("subCategories") LIMIT 1)
  )
WHERE "mainCategory" = 'Low carb'
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Low carb%'));

UPDATE recipes
SET 
  "mainCategory" = 'Aftensmad',
  "dietaryCategories" = COALESCE("dietaryCategories", '[]'::jsonb) || '["Low carb"]'::jsonb
WHERE "mainCategory" = 'Low carb'
  AND ("subCategories" IS NULL OR jsonb_array_length("subCategories") = 0)
  AND ("dietaryCategories" IS NULL OR NOT ("dietaryCategories"::text ILIKE '%Low carb%'));

-- Fjern duplikater fra dietaryCategories
UPDATE recipes
SET "dietaryCategories" = (
  SELECT jsonb_agg(DISTINCT value ORDER BY value)
  FROM jsonb_array_elements("dietaryCategories")
)
WHERE "dietaryCategories" IS NOT NULL;

-- ========================================
-- VERIFICER RESULTATET
-- ========================================
-- Tjek om der stadig er opskrifter med dietary categories som mainCategory
SELECT 
  COUNT(*) as antal_forkerte,
  "mainCategory" as forkert_mainCategory
FROM recipes
WHERE "mainCategory" IN (
  'Keto', 'Sense', 'GLP-1 kost', 'Meal prep', 'Anti-inflammatorisk',
  'Fleksitarisk', '5:2 diæt', 'Familiemad', 'Low carb',
  'Meal Prep', 'GLP-1', 'glp-1', 'glp1', 'SENSE'
)
GROUP BY "mainCategory"
ORDER BY antal_forkerte DESC;

-- Vis eksempler på opskrifter med Keto tag efter fix
SELECT 
  id,
  title,
  "mainCategory",
  "dietaryCategories"
FROM recipes
WHERE "dietaryCategories"::text ILIKE '%Keto%'
ORDER BY title
LIMIT 10;

