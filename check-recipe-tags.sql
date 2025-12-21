-- 🔍 Tjek hvilke dietary categories/tags der findes på opskrifter
-- Kør dette i Supabase SQL Editor

-- 1. Vis alle unikke dietary categories fra alle opskrifter
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL 
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY antal_opskrifter DESC;

-- 2. Tjek specifikt for GLP-1, Sense, Anti-inflammatorisk tags
SELECT 
  'GLP-1 kost' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%GLP-1 kost%'
    OR "dietaryCategories"::text ILIKE '%glp-1%'
    OR "dietaryCategories"::text ILIKE '%glp1%'
  )

UNION ALL

SELECT 
  'Sense' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%Sense%'

UNION ALL

SELECT 
  'Antiinflammatorisk' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%Antiinflammatorisk%'
    OR "dietaryCategories"::text ILIKE '%anti-inflammatorisk%'
    OR "dietaryCategories"::text ILIKE '%anti inflammatorisk%'
  )

UNION ALL

SELECT 
  'Fleksitarisk' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%Fleksitarisk%'

UNION ALL

SELECT 
  '5:2' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%5:2%'
    OR "dietaryCategories"::text ILIKE '%5-2%'
  )

UNION ALL

SELECT 
  'Meal prep' as tag,
  COUNT(*) as antal_opskrifter
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%Meal prep%'
    OR "dietaryCategories"::text ILIKE '%meal-prep%'
    OR "dietaryCategories"::text ILIKE '%mealprep%'
  );

-- 3. Vis eksempler på opskrifter med hver tag
SELECT 
  id,
  title,
  "dietaryCategories",
  "mainCategory"
FROM recipes
WHERE "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%GLP-1 kost%'
    OR "dietaryCategories"::text ILIKE '%Sense%'
    OR "dietaryCategories"::text ILIKE '%Antiinflammatorisk%'
  )
LIMIT 20;

-- 4. Tjek alle Ketoliv opskrifter (hvis de har et specifikt mønster)
SELECT 
  COUNT(*) as total_ketoliv_opskrifter,
  COUNT(CASE WHEN "dietaryCategories" IS NOT NULL THEN 1 END) as med_dietary_categories,
  COUNT(CASE WHEN "dietaryCategories" IS NULL OR jsonb_array_length("dietaryCategories") = 0 THEN 1 END) as uden_dietary_categories
FROM recipes
WHERE author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%';

