-- 📊 Detaljeret analyse af Ketoliv opskrifter og deres tags
-- Kør dette efter check-recipe-tags.sql

-- 1. Vis alle unikke tags på Ketoliv opskrifter
SELECT 
  jsonb_array_elements_text("dietaryCategories") as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND jsonb_array_length("dietaryCategories") > 0
GROUP BY tag
ORDER BY antal_opskrifter DESC;

-- 2. Tjek specifikt for de vigtige tags (GLP-1, Sense, Anti-inflammatorisk)
SELECT 
  'GLP-1 kost' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%GLP-1 kost%'
    OR "dietaryCategories"::text ILIKE '%glp-1%'
    OR "dietaryCategories"::text ILIKE '%glp1%'
  )

UNION ALL

SELECT 
  'Sense' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%Sense%'

UNION ALL

SELECT 
  'Antiinflammatorisk' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%Antiinflammatorisk%'
    OR "dietaryCategories"::text ILIKE '%anti-inflammatorisk%'
    OR "dietaryCategories"::text ILIKE '%anti inflammatorisk%'
  )

UNION ALL

SELECT 
  'Fleksitarisk' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND "dietaryCategories"::text ILIKE '%Fleksitarisk%'

UNION ALL

SELECT 
  '5:2' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%5:2%'
    OR "dietaryCategories"::text ILIKE '%5-2%'
  )

UNION ALL

SELECT 
  'Meal prep' as tag,
  COUNT(*) as antal_opskrifter,
  ROUND(COUNT(*) * 100.0 / 573, 2) as procent_af_total
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND "dietaryCategories" IS NOT NULL
  AND (
    "dietaryCategories"::text ILIKE '%Meal prep%'
    OR "dietaryCategories"::text ILIKE '%meal-prep%'
    OR "dietaryCategories"::text ILIKE '%mealprep%'
  );

-- 3. Vis de 14 opskrifter der mangler tags
SELECT 
  id,
  title,
  "mainCategory",
  "dietaryCategories",
  author,
  calories,
  carbs
FROM recipes
WHERE (author ILIKE '%ketoliv%' 
   OR title ILIKE '%keto%'
   OR description ILIKE '%keto%')
  AND ("dietaryCategories" IS NULL 
       OR jsonb_array_length("dietaryCategories") = 0)
ORDER BY title
LIMIT 20;

-- 4. Vis eksempler på opskrifter med hver af de vigtige tags
-- Brug subqueries så vi kan have LIMIT på hver SELECT
SELECT * FROM (
  SELECT 
    'GLP-1 kost eksempler' as kategori,
    id,
    title,
    "dietaryCategories",
    calories,
    carbs
  FROM recipes
  WHERE (author ILIKE '%ketoliv%' 
     OR title ILIKE '%keto%'
     OR description ILIKE '%keto%')
    AND "dietaryCategories" IS NOT NULL
    AND (
      "dietaryCategories"::text ILIKE '%GLP-1 kost%'
      OR "dietaryCategories"::text ILIKE '%glp-1%'
      OR "dietaryCategories"::text ILIKE '%glp1%'
    )
  LIMIT 5
) glp1

UNION ALL

SELECT * FROM (
  SELECT 
    'Sense eksempler' as kategori,
    id,
    title,
    "dietaryCategories",
    calories,
    carbs
  FROM recipes
  WHERE (author ILIKE '%ketoliv%' 
     OR title ILIKE '%keto%'
     OR description ILIKE '%keto%')
    AND "dietaryCategories" IS NOT NULL
    AND "dietaryCategories"::text ILIKE '%Sense%'
  LIMIT 5
) sense

UNION ALL

SELECT * FROM (
  SELECT 
    'Antiinflammatorisk eksempler' as kategori,
    id,
    title,
    "dietaryCategories",
    calories,
    carbs
  FROM recipes
  WHERE (author ILIKE '%ketoliv%' 
     OR title ILIKE '%keto%'
     OR description ILIKE '%keto%')
    AND "dietaryCategories" IS NOT NULL
    AND (
      "dietaryCategories"::text ILIKE '%Antiinflammatorisk%'
      OR "dietaryCategories"::text ILIKE '%anti-inflammatorisk%'
    )
  LIMIT 5
) antiinflam;

